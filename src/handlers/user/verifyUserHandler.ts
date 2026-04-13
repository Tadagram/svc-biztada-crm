import { UserStatus } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import { mappingPrefixPhoneNumber } from '@/utils';
import { checkUserInSystem, generateToken, saveUserSession, VerifyUserBody } from './userHelper';

export async function verifyUserHandler(
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

    if (user.status !== UserStatus.active) {
      return reply.status(403).send({
        success: false,
        message: 'Tài khoản đang bị khóa.',
      });
    }

    const { accessToken: token, refreshToken, expiresAt } = await generateToken(jwt, user);

    await saveUserSession(
      prisma,
      user.user_id,
      refreshToken,
      expiresAt,
      request.ip,
      request.headers['user-agent'] as string,
    );

    return reply.send({
      success: true,
      message: 'Xác thực thành công!',
      token,
      refreshToken,
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

export default verifyUserHandler;
