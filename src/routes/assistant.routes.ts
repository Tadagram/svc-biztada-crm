import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { chatHandler, historyHandler, clearHistoryHandler } from '@handlers/assistant';
import {
  chatAssistantSchema,
  historyAssistantSchema,
  clearHistoryAssistantSchema,
} from '@schemas/assistant.schema';

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

  fastify.delete(
    '/history',
    {
      schema: clearHistoryAssistantSchema,
      preHandler: [fastify.authenticate],
    },
    clearHistoryHandler as RouteHandlerMethod,
  );
}

export default assistantRoutes;
