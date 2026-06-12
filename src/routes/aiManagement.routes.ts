import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  upsertToolHandler,
  listToolsHandler,
  deleteToolHandler,
  upsertKnowledgeHandler,
  listKnowledgeHandler,
  deleteKnowledgeHandler,
} from '../handlers/aiManagement/aiLibraryHandlers';

export default async function aiManagementRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // Authentication requirement could be added here via preHandler
  fastify.post('/tools', upsertToolHandler);
  fastify.get('/tools', listToolsHandler);
  fastify.delete('/tools/:toolId', deleteToolHandler);

  fastify.post('/knowledge', upsertKnowledgeHandler);
  fastify.get('/knowledge', listKnowledgeHandler);
  fastify.delete('/knowledge/:knowledgeId', deleteKnowledgeHandler);
}
