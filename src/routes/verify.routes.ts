import { FastifyInstance } from 'fastify';
import { verifyUserHandler } from '@handlers/user';
import refreshTokenHandler from '@handlers/refreshToken';
import adminLoginHandler from '@handlers/auth/adminLoginHandler';
import adminInitPasswordHandler from '@handlers/auth/adminInitPasswordHandler';
import { verifyUserSchema } from '@schemas/verify.schema';
import { refreshTokenSchema } from '@schemas/refresh.schema';
import { adminLoginSchema, adminInitPasswordSchema } from '@schemas/auth.schema';

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

  // POST /auth/admin-login — admin login via svc-core-api is_admin check + bcrypt password
  fastify.post('/admin-login', { schema: adminLoginSchema }, adminLoginHandler);

  // POST /auth/admin-init-password — first-time password setup (only when no password set)
  fastify.post(
    '/admin-init-password',
    { schema: adminInitPasswordSchema },
    adminInitPasswordHandler,
  );
}

export default verifyRoutes;
