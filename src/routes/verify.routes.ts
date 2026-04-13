import { FastifyInstance } from 'fastify';
import verifyUserHandler from '@handlers/verifyUser';
import refreshTokenHandler from '@handlers/refreshToken';
import { verifyUserSchema } from '@schemas/verify.schema';
import { refreshTokenSchema } from '@schemas/refresh.schema';

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
}

export default verifyRoutes;
