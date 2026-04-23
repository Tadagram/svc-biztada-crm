import { UserStatus, UserRole } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import { mappingPrefixPhoneNumber } from '@/utils';
import {
  checkUserInSystem,
  generateAccessToken,
  generateRefreshToken,
  saveUserSession,
  VerifyUserBody,
} from './userHelper';

function validateUserStatus(user: any): { valid: boolean; error?: string } {
  if (user.role === UserRole.customer) {
    return { valid: false, error: 'Customer không được phép đăng nhập.' };
  }

  if (user.status !== UserStatus.active) {
    return { valid: false, error: 'Tài khoản đang bị khóa.' };
  }

  return { valid: true };
}

export async function handler(
  request: FastifyRequest<{
    Body: VerifyUserBody;
  }>,
  reply: FastifyReply,
) {
  const { phoneNumber } = request.body;
  const { jwt } = request.server;
  const { prisma, log: logger } = request;

  try {
    const phoneMapping = mappingPrefixPhoneNumber(phoneNumber);
    const user = await checkUserInSystem(prisma, phoneMapping);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'Người dùng không tồn tại.',
      });
    }

    const statusValidation = validateUserStatus(user);
    if (!statusValidation.valid) {
      return reply.status(403).send({
        success: false,
        message: statusValidation.error,
      });
    }

    const { token: refreshToken, expiresAt } = generateRefreshToken();

    const session = await saveUserSession(
      prisma,
      user.user_id,
      refreshToken,
      expiresAt,
      undefined,
      request.ip,
      request.headers['user-agent'] as string,
    );

    const token = generateAccessToken(jwt, user, session.session_id);

    return reply.send({
      success: true,
      message: 'Xác thực thành công!',
      token,
      user: {
        userId: user.user_id,
        role: user.role,
        agencyName: user.agency_name,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[VerifyUserHandler] Unexpected error');
    return reply.status(500).send({
      success: false,
      message: 'Đã có lỗi hệ thống xảy ra.',
    });
  }
}
