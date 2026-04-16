/**
 * Admin Login Handler
 *
 * POST /auth/admin-login  body: { phoneNumber, password }
 *
 * Flow:
 *  1. Normalize phone number
 *  2. Call svc-core-api GET /internal/users/admin-check?phone=<phone>
 *  3. If is_admin=false  â†’ 403 Forbidden
 *  4. Upsert user in biztada-crm users table (role=null = full admin access)
 *  5. Verify bcrypt password hash
 *     - If no password set yet â†’ 403 with code PASSWORD_NOT_SET
 *     - If password wrong     â†’ 401 Unauthorized
 *  6. Issue JWT access token + refresh token, save session
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserStatus } from '@prisma/client';
import {
  generateAccessToken,
  generateRefreshToken,
  saveUserSession,
} from '@handlers/user/userHelper';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Normalize phone to Telegram storage format (no +, no leading 0).
 * Examples: "+84926034793" â†’ "84926034793", "0926034793" â†’ "84926034793"
 * This matches how Telegram stores telegram_phone in svc-core-api DB.
 */
function normalizeTelegramPhone(phone: string): string {
  const stripped = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (stripped.startsWith('0')) {
    return '84' + stripped.slice(1);
  }
  return stripped;
}

interface AdminLoginBody {
  phoneNumber: string;
  password: string;
}

interface CoreApiAdminCheckResponse {
  exists: boolean;
  is_admin: boolean;
  user_id?: string;
  telegram_id?: number;
  first_name?: string;
  phone?: string;
}

async function checkAdminInCoreApi(phone: string): Promise<CoreApiAdminCheckResponse> {
  const coreApiUrl =
    process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';
  const url = `${coreApiUrl}/internal/users/admin-check?phone=${encodeURIComponent(phone)}`;

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

export async function adminLoginHandler(
  request: FastifyRequest<{ Body: AdminLoginBody }>,
  reply: FastifyReply,
) {
  const { phoneNumber, password } = request.body;
  const { jwt } = request.server;
  const { prisma, log: logger } = request;

  try {
    const normalizedPhone = normalizeTelegramPhone(phoneNumber);

    // --- Step 1: Verify admin status in svc-core-api ---
    let coreCheck: CoreApiAdminCheckResponse;
    try {
      coreCheck = await checkAdminInCoreApi(normalizedPhone);
    } catch (err) {
      logger.error({ err }, '[AdminLogin] Failed to reach svc-core-api');
      return reply.status(503).send({
        success: false,
        message: 'KhÃ´ng thá»ƒ xÃ¡c thá»±c quyá»n admin. Vui lÃ²ng thá»­ láº¡i sau.',
      });
    }

    if (!coreCheck.exists) {
      return reply.status(404).send({
        success: false,
        message: 'Sá»‘ Ä‘iá»‡n thoáº¡i chÆ°a Ä‘Æ°á»£c Ä‘Äƒng kÃ½ trÃªn há»‡ thá»‘ng.',
      });
    }

    if (!coreCheck.is_admin) {
      return reply.status(403).send({
        success: false,
        message: 'TÃ i khoáº£n khÃ´ng cÃ³ quyá»n admin.',
      });
    }

    // --- Step 2: Upsert admin user in biztada-crm DB ---
    const adminUser = await prisma.users.upsert({
      where: { phone_number: normalizedPhone },
      create: {
        phone_number: normalizedPhone,
        role: null,
        status: UserStatus.active,
      },
      update: {
        status: UserStatus.active,
        updated_at: new Date(),
      },
    });

    if (adminUser.status !== UserStatus.active) {
      return reply.status(403).send({
        success: false,
        message: 'TÃ i khoáº£n Ä‘ang bá»‹ khÃ³a.',
      });
    }

    // --- Step 3: Verify password ---
    if (!adminUser.password_hash) {
      return reply.status(403).send({
        success: false,
        code: 'PASSWORD_NOT_SET',
        message:
          'TÃ i khoáº£n chÆ°a cÃ³ máº­t kháº©u. Vui lÃ²ng Ä‘áº·t máº­t kháº©u láº§n Ä‘áº§u táº¡i /auth/admin-init-password.',
      });
    }

    const passwordOk = await bcrypt.compare(password, adminUser.password_hash);
    if (!passwordOk) {
      return reply.status(401).send({
        success: false,
        message: 'Máº­t kháº©u khÃ´ng Ä‘Ãºng.',
      });
    }

    // --- Step 4: Issue JWT ---
    const sessionId = crypto.randomBytes(16).toString('hex');
    const token = generateAccessToken(jwt, adminUser, sessionId);
    const { token: refreshToken, expiresAt } = generateRefreshToken();

    await saveUserSession(
      prisma,
      adminUser.user_id,
      refreshToken,
      expiresAt,
      request.ip,
      request.headers['user-agent'] as string,
    );

    return reply.send({
      success: true,
      message: 'ÄÄƒng nháº­p admin thÃ nh cÃ´ng!',
      token,
      refreshToken,
      user: {
        userId: adminUser.user_id,
        role: adminUser.role,
        agencyName: null,
        phoneNumber: normalizedPhone,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[AdminLoginHandler] Unexpected error');
    return reply.status(500).send({
      success: false,
      message: 'ÄÃ£ cÃ³ lá»—i há»‡ thá»‘ng xáº£y ra.',
    });
  }
}

export default adminLoginHandler;
