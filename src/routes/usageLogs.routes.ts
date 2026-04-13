import { FastifyInstance } from 'fastify';
import { getUsageLogsHandler } from '@handlers/worker';
import { getUsageLogsSchema } from '@schemas/usageLogs.schema';

export default async function usageLogsRoutes(fastify: FastifyInstance) {
  // GET /usage-logs – worker usage history with pagination
  fastify.get('/', { schema: getUsageLogsSchema }, getUsageLogsHandler);
}
