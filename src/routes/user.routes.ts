import { FastifyInstance } from 'fastify';
import handler from '@handlers/createUser';
import { createUserSchema } from '@schemas/user.schema';

async function userRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      schema: createUserSchema,
    },
    handler,
  );
}

export default userRoutes;
