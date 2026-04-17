import { FastifyInstance } from 'fastify';
import { verifyUserHandler } from '@handlers/user';
import refreshTokenHandler from '@handlers/refreshToken';
import adminTelegramLoginHandler from '@handlers/auth/adminTelegramLoginHandler';
import { verifyUserSchema } from '@schemas/verify.schema';
import { refreshTokenSchema } from '@schemas/refresh.schema';
import { adminTelegramLoginSchema } from '@schemas/auth.schema';

async function verifyRoutes(fastify: FastifyInstance) {
  fastify.post('/verify', { schema: verifyUserSchema }, verifyUserHandler);

  fastify.post('/refresh', { schema: refreshTokenSchema }, refreshTokenHandler);

  // POST /auth/admin-telegram-login
  // Rate limited: 10 attempts/min per IP (Telegram widget already throttles on client side)
  fastify.post(
    '/admin-telegram-login',
    {
      schema: adminTelegramLoginSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          errorResponseBuilder: () => ({
            success: false,
            code: 'TOO_MANY_REQUESTS',
            message: 'Qua nhieu yeu cau. Vui long cho 1 phut roi thu lai.',
          }),
        },
      },
    },
    adminTelegramLoginHandler,
  );
}

export default verifyRoutes;
