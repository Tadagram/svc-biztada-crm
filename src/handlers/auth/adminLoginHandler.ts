/**
 * Admin Login Handler
 *
 * POST /auth/admin-login  body: { phoneNumber, password }
 *
 * Flow:
 *  1. Normalize phone number
 *  2. Call svc-core-api to confirm is_admin=true
 *  3. Find user in biztada-crm DB (must have been provisioned first)
 *  4. Verify bcrypt password
 *  5. Issue JWT access token + refresh token
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

export function normalizeTelegramPhone(phone: string): string {
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
  phone?: string;
}

export async function checkAdminInCoreApi(phone: string): Promise<CoreApiAdminCheckResponse> {
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

    // Step 1: Verify admin status in svc-core-api
    let coreCheck: CoreApiAdminCheckResponse;
    try {
      coreCheck = await checkAdminInCoreApi(normalizedPhone);
    } catch (err) {
      logger.error({ err }, '[AdminLogin] Failed to reach svc-core-api');
      return reply.status(503).send({
        success: false,
        message: 'Khong the xac thuc quyen admin. Vui long thu lai sau.',
      });
    }

    if (!coreCheck.exists || !coreCheck.is_admin) {
      return reply.status(403).send({
        success: false,
        message: 'So dien thoai khong co quyen admin.',
      });
    }

    // Step 2: Find provisioned user in biztada-crm DB
    const adminUser = await prisma.users.findUnique({
      where: { phone_number: normalizedPhone },
    });

    if (!adminUser || !adminUser.password_hash) {
      return reply.status(403).send({
        success: false,
        code: 'NOT_PROVISIONED',
        message: 'Tai khoan chua duoc cap mat khau. Lien he super-admin de duoc cap quyen.',
      });
    }

    if (adminUser.status !== UserStatus.active) {
      return reply.status(403).send({
        success: false,
        message: 'Tai khoan dang bi khoa.',
      });
    }

    // Step 3: Verify bcrypt password
    const passwordOk = await bcrypt.compare(password, adminUser.password_hash);
    if (!passwordOk) {
      return reply.status(401).send({
        success: false,
        message: 'Mat khau khong dung.',
      });
    }

    // Step 4: Issue JWT
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
      message: 'Dang nhap admin thanh cong!',
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
      message: 'Da co loi he thong xay ra.',
    });
  }
}

export default adminLoginHandler;
