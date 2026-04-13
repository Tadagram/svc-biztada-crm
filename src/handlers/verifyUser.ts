import { PrismaClient, Users, UserStatus } from '.prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { JWT } from '@fastify/jwt';

const TIME_REFRESH_TOKEN = 7; // 7 ngay

interface VerifyUserBody {
  phoneNumber: string;
}

async function checkUserInSystem(prisma: PrismaClient, phoneNumber: string): Promise<Users | null> {
  return prisma.users.findFirst({
    where: {
      phone_number: phoneNumber,
      deleted_at: null,
    },
  });
}

async function generateToken(
  jwt: JWT,
  user: Users,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const token = jwt.sign(
    {
      userId: user.user_id,
      role: user.role,
      agencyName: user.agency_name,
    },
    { expiresIn: '1h' },
  );

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TIME_REFRESH_TOKEN);

  return {
    accessToken: token,
    refreshToken,
    expiresAt,
  };
}

async function handler(request: FastifyRequest<{ Body: VerifyUserBody }>, reply: FastifyReply) {
  const { phoneNumber } = request.body;
  const { jwt } = request.server;
  const { prisma, log: logger } = request;

  try {
    const user = await checkUserInSystem(prisma, phoneNumber);
    if (!user) {
      return reply.status(404).send({ success: false, message: 'Người dùng không tồn tại.' });
    }

    if (user.status !== UserStatus.active) {
      return reply.status(403).send({ success: false, message: 'Tài khoản đang bị khóa.' });
    }

    const { accessToken: token, refreshToken, expiresAt } = await generateToken(jwt, user);

    await prisma.userSessions.create({
      data: {
        user_id: user.user_id,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'] as string,
      },
    });

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
    return reply.status(500).send({ success: false, message: 'Đã có lỗi hệ thống xảy ra.' });
  }
}

export default handler;
