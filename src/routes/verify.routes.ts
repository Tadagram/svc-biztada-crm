import { FastifyInstance } from 'fastify';
import { verifyUserHandler } from '@handlers/user';
import refreshTokenHandler from '@handlers/refreshToken';
import adminLoginHandler from '@handlers/auth/adminLoginHandler';
import adminProvisionHandler from '@handlers/auth/adminProvisionHandler';
import { verifyUserSchema } from '@schemas/verify.schema';
import { refreshTokenSchema } from '@schemas/refresh.schema';
import { adminLoginSchema, adminProvisionSchema } from '@schemas/auth.schema';

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

  // POST /auth/admin-login -- admin login via svc-core-api is_admin check + bcrypt password
  fastify.post('/admin-login', { schema: adminLoginSchema }, adminLoginHandler);

  // POST /auth/admin-provision -- super-admin provisions admin account with auto-generated password
  fastify.post('/admin-provision', { schema: adminProvisionSchema }, adminProvisionHandler);
}

export default verifyRoutes;
