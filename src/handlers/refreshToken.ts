import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify';
import { PrismaClient, UserSessions, Users } from '@prisma/client';
import crypto from 'crypto';

const TOKEN_REFRESH_EXPIRY = 7;

interface RefreshTokenBody {
  refreshToken: string;
}

interface SessionWithUser extends UserSessions {
  user: Users;
}

interface ValidationResult {
  valid: boolean;
  session?: SessionWithUser;
  error?: string;
}

async function validateSession(
  prisma: PrismaClient,
  refreshToken: string,
  logger: FastifyBaseLogger,
): Promise<ValidationResult> {
  try {
    const session = await prisma.userSessions.findUnique({
      where: { refresh_token: refreshToken },
      include: { user: true },
    });

    if (!session) {
      return { valid: false, error: 'Refresh Token không hợp lệ.' };
    }

    if (session.expires_at < new Date()) {
      await prisma.userSessions.delete({ where: { session_id: session.session_id } });
      return { valid: false, error: 'Refresh Token đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    return { valid: true, session };
  } catch (error) {
    logger.error({ err: error }, '[ValidateSession] Error');
    return { valid: false, error: 'Lỗi xác thực Refresh Token.' };
  }
}

function generateNewToken(request: FastifyRequest, session: SessionWithUser): string {
  const { jwt } = request.server;
  return jwt.sign(
    {
      userId: session.user.user_id,
      role: session.user.role,
      agencyName: session.user.agency_name,
      parentUserId: session.user.parent_user_id,
    },
    { expiresIn: '1h' },
  );
}

function generateNewRefreshToken(): { token: string; expiresAt: Date } {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_REFRESH_EXPIRY);

  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt,
  };
}

async function handler(request: FastifyRequest<{ Body: RefreshTokenBody }>, reply: FastifyReply) {
  const { refreshToken } = request.body;
  const { prisma, log: logger } = request;

  try {
    const validation = await validateSession(prisma, refreshToken, logger);
    if (!validation.valid) {
      return reply.status(401).send({ success: false, message: validation.error });
    }

    const session = validation.session as SessionWithUser;
    const token = generateNewToken(request, session);
    const { token: newRefreshToken, expiresAt: newExpiresAt } = generateNewRefreshToken();

    await prisma.$transaction([
      prisma.userSessions.delete({ where: { session_id: session.session_id } }),
      prisma.userSessions.create({
        data: {
          user_id: session.user.user_id,
          refresh_token: newRefreshToken,
          expires_at: newExpiresAt,
          ip_address: request.ip,
          user_agent: request.headers['user-agent'] as string,
        },
      }),
    ]);

    return reply.send({
      success: true,
      message: 'Làm mới Token thành công.',
      token,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error({ err: error }, '[RefreshTokenHandler] Error');
    return reply.status(500).send({ success: false, message: 'Lỗi xác thực Token.' });
  }
}

export default handler;
