import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getUsageLogsHandler, getUsageLogsByWorkerHandler } from '@handlers/worker';
import { getUsageLogsSchema, getUsageLogsByWorkerSchema } from '@schemas/usageLogs.schema';

export default async function usageLogsRoutes(fastify: FastifyInstance) {
  // GET /usage-logs – worker usage history with pagination
  fastify.get(
    '/',
    {
      schema: getUsageLogsSchema,
      preHandler: [fastify.authenticate],
    },
    getUsageLogsHandler as RouteHandlerMethod,
  );
  // GET /usage-logs/by-worker – aggregated per-worker view
  fastify.get(
    '/by-worker',
    {
      schema: getUsageLogsByWorkerSchema,
      preHandler: [fastify.authenticate],
    },
    getUsageLogsByWorkerHandler as RouteHandlerMethod,
  );
}
