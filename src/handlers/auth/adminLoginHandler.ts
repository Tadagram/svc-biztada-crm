/**
 * Admin Login Handler
 *
 * POST /auth/admin-login  body: { phoneNumber }
 *
 * Flow:
 *  1. Normalize phone number
 *  2. Call svc-core-api GET /internal/users/admin-check?phone=<phone>
 *  3. If is_admin=false  → 403 Forbidden
 *  4. Upsert user in biztada-crm users table (role=null = full admin access)
 *  5. Issue JWT access token + refresh token, save session
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserStatus } from '@prisma/client';
import { mappingPrefixPhoneNumber } from '@/utils';
import {
  generateAccessToken,
  generateRefreshToken,
  saveUserSession,
} from '@handlers/user/userHelper';
import crypto from 'crypto';

interface AdminLoginBody {
  phoneNumber: string;
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
    // Internal call — no external timeout needed but guard against hanging
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
  const { phoneNumber } = request.body;
  const { jwt } = request.server;
  const { prisma, log: logger } = request;

  try {
    const normalizedPhone = mappingPrefixPhoneNumber(phoneNumber);

    // --- Step 1: Verify admin status in svc-core-api ---
    let coreCheck: CoreApiAdminCheckResponse;
    try {
      coreCheck = await checkAdminInCoreApi(normalizedPhone);
    } catch (err) {
      logger.error({ err }, '[AdminLogin] Failed to reach svc-core-api');
      return reply.status(503).send({
        success: false,
        message: 'Không thể xác thực quyền admin. Vui lòng thử lại sau.',
      });
    }

    if (!coreCheck.exists) {
      return reply.status(404).send({
        success: false,
        message: 'Số điện thoại chưa được đăng ký trên hệ thống.',
      });
    }

    if (!coreCheck.is_admin) {
      return reply.status(403).send({
        success: false,
        message: 'Tài khoản không có quyền admin.',
      });
    }

    // --- Step 2: Upsert admin user in biztada-crm DB ---
    // role=null means full admin access (no permission restrictions)
    const adminUser = await prisma.users.upsert({
      where: { phone_number: normalizedPhone },
      create: {
        phone_number: normalizedPhone,
        role: null, // null = full admin, no role restrictions
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
        message: 'Tài khoản đang bị khóa.',
      });
    }

    // --- Step 3: Issue JWT ---
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
      message: 'Đăng nhập admin thành công!',
      token,
      refreshToken,
      user: {
        userId: adminUser.user_id,
        role: adminUser.role, // null = full admin
        phoneNumber: normalizedPhone,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[AdminLoginHandler] Unexpected error');
    return reply.status(500).send({
      success: false,
      message: 'Đã có lỗi hệ thống xảy ra.',
    });
  }
}

export default adminLoginHandler;
