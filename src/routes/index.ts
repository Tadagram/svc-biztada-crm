import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import userRoutes from './user.routes';
import verifyRoutes from './verify.routes';
import permissionRoutes from './permission.routes';

async function routes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(verifyRoutes, { prefix: '/auth' });
  fastify.register(permissionRoutes, { prefix: '/permissions' });

  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        description: 'Check API health status',
        summary: 'Health Check',
        response: {
          200: {
            description: 'Server is running',
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return { status: 'ok' };
    },
  );
}

export default routes;
