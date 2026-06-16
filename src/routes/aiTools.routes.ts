import { FastifyInstance } from 'fastify';
import aiToolsHandler from '../handlers/aiTools';

export default async function aiToolsRoutes(fastify: FastifyInstance) {
  fastify.register(
    async (instance) => {
      // Protect these routes
      instance.addHook('preHandler', instance.authenticate);
      instance.register(aiToolsHandler);
    },
    { prefix: '/' },
  );
}
