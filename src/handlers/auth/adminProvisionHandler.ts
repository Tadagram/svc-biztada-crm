/**
 * Admin Provision Handler
 *
 * POST /auth/admin-provision  body: { phoneNumber }
 *
 * Called by super-admin to provision (or re-provision) an admin account.
 *
 * Flow:
 *  1. Verify phoneNumber is marked is_admin=true in svc-core-api
 *  2. Generate a random 12-char alphanumeric password
 *  3. Hash it with bcrypt
 *  4. Upsert user record in biztada-crm DB (create or update password_hash)
 *  5. Return { success: true, password: "<plaintext>" }
 *     — super-admin distributes this to the admin
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { checkAdminInCoreApi, normalizeTelegramPhone } from './adminLoginHandler';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const PASSWORD_LENGTH = 12;

function generateRandomPassword(): string {
  const bytes = new Uint8Array(PASSWORD_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length])
    .join('');
}

interface AdminProvisionBody {
  phoneNumber: string;
}

export async function adminProvisionHandler(
  request: FastifyRequest<{ Body: AdminProvisionBody }>,
  reply: FastifyReply,
) {
  const { phoneNumber } = request.body;
  const { prisma, log: logger } = request;

  try {
    const normalizedPhone = normalizeTelegramPhone(phoneNumber);

    // Step 1: Confirm admin status in svc-core-api
    let coreCheck;
    try {
      coreCheck = await checkAdminInCoreApi(normalizedPhone);
    } catch (err) {
      logger.error({ err }, '[AdminProvision] Failed to reach svc-core-api');
      return reply.status(503).send({
        success: false,
        message: 'Khong the xac thuc voi svc-core-api. Thu lai sau.',
      });
    }

    if (!coreCheck.exists || !coreCheck.is_admin) {
      return reply.status(403).send({
        success: false,
        message: 'So dien thoai nay khong duoc danh dau la admin trong he thong.',
      });
    }

    // Step 2: Generate plaintext password and hash
    const plainPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

    // Step 3: Upsert user in biztada-crm DB
    await prisma.users.upsert({
      where: { phone_number: normalizedPhone },
      create: {
        phone_number: normalizedPhone,
        password_hash: passwordHash,
        role: UserRole.admin,
        status: UserStatus.active,
      },
      update: {
        password_hash: passwordHash,
        role: UserRole.admin,
        status: UserStatus.active,
      },
    });

    logger.info({ phone: normalizedPhone }, '[AdminProvision] Provisioned admin account');

    return reply.status(200).send({
      success: true,
      message: 'Cap phat mat khau admin thanh cong.',
      phoneNumber: normalizedPhone,
      password: plainPassword,
    });
  } catch (error) {
    logger.error({ err: error }, '[AdminProvisionHandler] Unexpected error');
    return reply.status(500).send({
      success: false,
      message: 'Da co loi he thong xay ra.',
    });
  }
}

export default adminProvisionHandler;
