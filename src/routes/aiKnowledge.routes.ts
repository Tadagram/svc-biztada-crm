import { FastifyInstance } from 'fastify';
import aiKnowledgeHandler from '../handlers/aiKnowledge';

export default async function aiKnowledgeRoutes(fastify: FastifyInstance) {
  fastify.register(
    async (instance) => {
      // Protect these routes
      instance.addHook('preHandler', instance.authenticate);
      instance.register(aiKnowledgeHandler);
    },
    { prefix: '/' },
  );
}
