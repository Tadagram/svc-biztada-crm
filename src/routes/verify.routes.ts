import { FastifyInstance } from 'fastify';
import { verifyUserHandler } from '@handlers/user';
import refreshTokenHandler from '@handlers/refreshToken';
import adminLoginHandler from '@handlers/auth/adminLoginHandler';
import adminProvisionHandler from '@handlers/auth/adminProvisionHandler';
import { verifyUserSchema } from '@schemas/verify.schema';
import { refreshTokenSchema } from '@schemas/refresh.schema';
import { adminLoginSchema, adminProvisionSchema } from '@schemas/auth.schema';

const PROVISION_SECRET = process.env.SUPER_ADMIN_SECRET ?? '';

async function verifyRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/verify',
    {
      schema: verifyUserSchema,
    },
    verifyUserHandler,
  );

  fastify.post(
    '/refresh',
    {
      schema: refreshTokenSchema,
    },
    refreshTokenHandler,
  );

  // POST /auth/admin-login -- rate-limited to 5 attempts/min per IP
  fastify.post(
    '/admin-login',
    {
      schema: adminLoginSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          errorResponseBuilder: () => ({
            success: false,
            code: 'TOO_MANY_REQUESTS',
            message: 'Qua nhieu lan thu. Vui long cho 1 phut roi thu lai.',
          }),
        },
      },
    },
    adminLoginHandler,
  );

  // POST /auth/admin-provision -- super-admin only, guarded by X-Super-Admin-Secret header
  fastify.post(
    '/admin-provision',
    {
      schema: adminProvisionSchema,
      config: {
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
      preHandler: async (request, reply) => {
        if (!PROVISION_SECRET) {
          request.log.warn(
            '[AdminProvision] SUPER_ADMIN_SECRET env var not set — rejecting all requests',
          );
          return reply
            .status(503)
            .send({ success: false, message: 'Endpoint chua duoc cau hinh.' });
        }
        const provided = request.headers['x-super-admin-secret'];
        if (!provided || provided !== PROVISION_SECRET) {
          request.log.warn({ ip: request.ip }, '[AdminProvision] Unauthorized secret');
          return reply
            .status(401)
            .send({ success: false, message: 'Khong co quyen thuc hien hanh dong nay.' });
        }
      },
    },
    adminProvisionHandler,
  );
}

export default verifyRoutes;
