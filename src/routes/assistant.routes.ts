import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { chatHandler, historyHandler } from '@handlers/assistant';
import { chatAssistantSchema, historyAssistantSchema } from '@schemas/assistant.schema';

async function assistantRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/chat',
    {
      schema: chatAssistantSchema,
      preHandler: [fastify.optionalAuthenticate],
    },
    chatHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/history',
    {
      schema: historyAssistantSchema,
      preHandler: [fastify.authenticate],
    },
    historyHandler as RouteHandlerMethod,
  );
}

export default assistantRoutes;
