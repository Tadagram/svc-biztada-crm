/**
 * Admin Init Password Handler
 *
 * POST /auth/admin-init-password  body: { phoneNumber, password }
 *
 * Allows an admin to set their password for the FIRST TIME ONLY.
 * If a password is already set, this endpoint returns 409.
 *
 * Flow:
 *  1. Normalize phone
 *  2. Confirm is_admin=true via svc-core-api
 *  3. Find or create user in biztada-crm DB
 *  4. If password_hash already set → 409 Conflict
 *  5. Hash + save new password
 *  6. Return 200
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

function normalizeTelegramPhone(phone: string): string {
  const stripped = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (stripped.startsWith('0')) {
    return '84' + stripped.slice(1);
  }
  return stripped;
}

interface AdminInitPasswordBody {
  phoneNumber: string;
  password: string;
}

interface CoreApiAdminCheckResponse {
  exists: boolean;
  is_admin: boolean;
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

export async function adminInitPasswordHandler(
  request: FastifyRequest<{ Body: AdminInitPasswordBody }>,
  reply: FastifyReply,
) {
  const { phoneNumber, password } = request.body;
  const { prisma, log: logger } = request;

  try {
    const normalizedPhone = normalizeTelegramPhone(phoneNumber);

    // Verify admin via svc-core-api
    let coreCheck: CoreApiAdminCheckResponse;
    try {
      coreCheck = await checkAdminInCoreApi(normalizedPhone);
    } catch (err) {
      logger.error({ err }, '[AdminInitPassword] Failed to reach svc-core-api');
      return reply.status(503).send({
        success: false,
        message: 'Không thể xác thực. Vui lòng thử lại sau.',
      });
    }

    if (!coreCheck.exists || !coreCheck.is_admin) {
      return reply.status(403).send({
        success: false,
        message: 'Số điện thoại không có quyền admin.',
      });
    }

    // Find or create user in biztada-crm
    const existingUser = await prisma.users.findUnique({
      where: { phone_number: normalizedPhone },
    });

    if (existingUser?.password_hash) {
      return reply.status(409).send({
        success: false,
        message: 'Mật khẩu đã được đặt. Nếu quên mật khẩu, vui lòng liên hệ quản trị.',
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.users.upsert({
      where: { phone_number: normalizedPhone },
      create: {
        phone_number: normalizedPhone,
        role: null,
        status: UserStatus.active,
        password_hash: hash,
      },
      update: {
        password_hash: hash,
        updated_at: new Date(),
      },
    });

    return reply.send({
      success: true,
      message: 'Đặt mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.',
    });
  } catch (error) {
    logger.error({ err: error }, '[AdminInitPasswordHandler] Unexpected error');
    return reply.status(500).send({
      success: false,
      message: 'Đã có lỗi hệ thống xảy ra.',
    });
  }
}

export default adminInitPasswordHandler;
