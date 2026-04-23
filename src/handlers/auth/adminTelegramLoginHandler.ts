/**
 * Admin Telegram Login Handler
 *
 * POST /auth/admin-telegram-login  body: TelegramAuthData
 *
 * Flow:
 *  1. Verify Telegram HMAC hash using TELEGRAM_BOT_TOKEN
 *  2. Check auth_date freshness (max 10 minutes for admin)
 *  3. Call svc-core-api: check telegram_id has is_admin=true
 *  4. Upsert user in biztada-crm DB (manages permissions local to this service)
 *  5. Issue JWT access token + refresh token
 *
 * Admin set via direct DB edit in svc-core-api (is_admin=true field).
 * No password, no provision flow — Telegram identity IS the credential.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserStatus } from '@prisma/client';
import crypto from 'crypto';
import {
  generateAccessToken,
  generateRefreshToken,
  saveUserSession,
} from '@handlers/user/userHelper';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

/** Max age for Telegram auth data — 10 minutes for admin login */
const MAX_AUTH_AGE_SECONDS = 600;

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface CoreApiAdminCheckResponse {
  exists: boolean;
  is_admin: boolean;
  user_id?: string;
  phone?: string;
  telegram_id?: number;
}

function normalizePhone(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('tg_')) return trimmed;
  return trimmed.replace(/\D/g, '');
}

function buildPhoneVariants(input?: string | null): string[] {
  const raw = (input ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('tg_')) return [raw];

  const digits = normalizePhone(raw);
  if (!digits) return [raw];

  const variants = new Set<string>([raw, digits, `+${digits}`]);

  if (digits.startsWith('84')) {
    const local = `0${digits.slice(2)}`;
    variants.add(local);
    variants.add(`+${local}`);
  }

  if (digits.startsWith('0')) {
    const intl = `84${digits.slice(1)}`;
    variants.add(intl);
    variants.add(`+${intl}`);
  }

  return Array.from(variants).filter(Boolean);
}

/**
 * Verifies the Telegram Login Widget hash.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
function verifyTelegramHash(data: TelegramAuthData): boolean {
  if (!BOT_TOKEN) return false;

  const { hash, ...fields } = data;
  const checkString = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

async function checkAdminByTelegramId(telegramId: number): Promise<CoreApiAdminCheckResponse> {
  const coreApiUrl =
    process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';
  const url = `${coreApiUrl}/internal/users/admin-check?telegram_id=${telegramId}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`core-api admin-check returned ${res.status}`);
  }

  return res.json() as Promise<CoreApiAdminCheckResponse>;
}

export async function adminTelegramLoginHandler(
  request: FastifyRequest<{ Body: TelegramAuthData }>,
  reply: FastifyReply,
) {
  const data = request.body;
  const { jwt } = request.server;
  const { prisma, log: logger } = request;

  // 1. Verify Telegram HMAC hash
  if (!verifyTelegramHash(data)) {
    logger.warn({ ip: request.ip }, '[AdminTelegramLogin] Invalid hash');
    return reply.status(401).send({
      success: false,
      message: 'Du lieu xac thuc Telegram khong hop le.',
    });
  }

  // 2. Check auth_date freshness
  const ageSeconds = Math.floor(Date.now() / 1000) - data.auth_date;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
    return reply.status(401).send({
      success: false,
      message: 'Phien xac thuc da het han. Vui long dang nhap lai.',
    });
  }

  // 3. Check admin status in svc-core-api via telegram_id
  let coreCheck: CoreApiAdminCheckResponse;
  try {
    coreCheck = await checkAdminByTelegramId(data.id);
  } catch (err) {
    logger.error({ err }, '[AdminTelegramLogin] Failed to reach svc-core-api');
    return reply.status(503).send({
      success: false,
      message: 'Khong the xac thuc quyen admin. Vui long thu lai sau.',
    });
  }

  if (!coreCheck.exists || !coreCheck.is_admin) {
    logger.warn({ telegramId: data.id, username: data.username }, '[AdminTelegramLogin] Not admin');
    return reply.status(403).send({
      success: false,
      message: 'Tai khoan nay khong co quyen quan tri.',
    });
  }

  if (!coreCheck.user_id) {
    logger.error({ telegramId: data.id }, '[AdminTelegramLogin] core-api response missing user_id');
    return reply.status(503).send({
      success: false,
      message: 'Khong the dong bo dinh danh user tu core-api. Vui long thu lai sau.',
    });
  }

  // 4. Upsert user in biztada-crm DB
  // phone from svc-core-api; fall back to telegram_id string if not available
  const phone = coreCheck.phone ?? `tg_${data.id}`;

  let adminUser = await prisma.users.findUnique({
    where: { user_id: coreCheck.user_id },
  });

  if (!adminUser) {
    const phoneMatched = await prisma.users.findFirst({
      where: {
        phone_number: {
          in: buildPhoneVariants(phone),
        },
      },
    });
    if (phoneMatched) {
      logger.warn(
        {
          coreUserId: coreCheck.user_id,
          crmUserId: phoneMatched.user_id,
          phone,
          telegramId: data.id,
        },
        '[AdminTelegramLogin] Migrating CRM user_id to core user_id',
      );

      adminUser = await prisma.users.update({
        where: { user_id: phoneMatched.user_id },
        data: {
          user_id: coreCheck.user_id,
          phone_number: phone,
          role: null,
          status: UserStatus.active,
        },
      });
    } else {
      adminUser = await prisma.users.create({
        data: {
          user_id: coreCheck.user_id,
          phone_number: phone,
          role: null,
          status: UserStatus.active,
        },
      });
    }
  } else {
    adminUser = await prisma.users.update({
      where: { user_id: adminUser.user_id },
      data: {
        role: null,
        status: UserStatus.active,
      },
    });
  }

  if (adminUser.status !== UserStatus.active) {
    return reply.status(403).send({
      success: false,
      message: 'Tai khoan dang bi khoa.',
    });
  }

  // 5. Issue JWT
  const sessionId = crypto.randomUUID();
  const token = generateAccessToken(jwt, adminUser, sessionId);
  const { token: refreshToken, expiresAt } = generateRefreshToken();

  await saveUserSession(
    prisma,
    adminUser.user_id,
    refreshToken,
    expiresAt,
    sessionId,
    request.ip,
    request.headers['user-agent'] as string,
  );

  logger.info(
    { telegramId: data.id, phone, username: data.username },
    '[AdminTelegramLogin] Login success',
  );

  return reply.send({
    success: true,
    message: 'Dang nhap admin thanh cong!',
    token,
    refreshToken,
    user: {
      userId: adminUser.user_id,
      role: adminUser.role,
      phoneNumber: phone,
      telegramId: data.id,
      firstName: data.first_name,
      lastName: data.last_name ?? null,
      username: data.username ?? null,
      photoUrl: data.photo_url ?? null,
    },
  });
}

export default adminTelegramLoginHandler;
