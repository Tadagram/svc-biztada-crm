import { FastifyInstance } from 'fastify';
import { getUsageLogsHandler, getUsageLogsByWorkerHandler } from '@handlers/worker';
import { getUsageLogsSchema, getUsageLogsByWorkerSchema } from '@schemas/usageLogs.schema';

export default async function usageLogsRoutes(fastify: FastifyInstance) {
  // GET /usage-logs – worker usage history with pagination
  fastify.get('/', { schema: getUsageLogsSchema }, getUsageLogsHandler);
  // GET /usage-logs/by-worker – aggregated per-worker view
  fastify.get('/by-worker', { schema: getUsageLogsByWorkerSchema }, getUsageLogsByWorkerHandler);
}
