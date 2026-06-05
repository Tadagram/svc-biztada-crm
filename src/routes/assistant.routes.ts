import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { chatHandler, historyHandler } from '@handlers/assistant';
import { chatAssistantSchema, historyAssistantSchema } from '@schemas/assistant.schema';

async function assistantRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/chat',
    { schema: chatAssistantSchema },
    chatHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/history',
    { schema: historyAssistantSchema },
    historyHandler as RouteHandlerMethod,
  );
}

export default assistantRoutes;
