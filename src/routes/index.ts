import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import userRoutes from './user.routes';
import verifyRoutes from './verify.routes';
import permissionRoutes from './permission.routes';
import workerRoutes from './worker.routes';
import agencyWorkerRoutes from './agencyWorker.routes';
import usageLogsRoutes from './usageLogs.routes';
import notificationRoutes from './notification.routes';
import topupRoutes from './topup.routes';
import settingsRoutes from './settings.routes';
import dashboardRoutes from './dashboard.routes';

async function routes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(verifyRoutes, { prefix: '/auth' });
  fastify.register(permissionRoutes, { prefix: '/permissions' });
  fastify.register(workerRoutes, { prefix: '/workers' });
  fastify.register(agencyWorkerRoutes, { prefix: '/agency-workers' });
  fastify.register(usageLogsRoutes, { prefix: '/usage-logs' });
  fastify.register(notificationRoutes, { prefix: '/notifications' });
  fastify.register(topupRoutes, { prefix: '/topup' });
  fastify.register(settingsRoutes, { prefix: '/settings' });
  fastify.register(dashboardRoutes, { prefix: '/dashboard' });

  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        description: 'Check API health status including database connectivity and uptime',
        summary: 'Health Check',
        response: {
          200: {
            description: 'Server is healthy',
            type: 'object',
            properties: {
              status: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
              db: { type: 'string' },
              version: { type: 'string' },
            },
          },
          503: {
            description: 'Service unavailable',
            type: 'object',
            properties: {
              status: { type: 'string' },
              db: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // DB ping
        await fastify.prisma.$queryRaw`SELECT 1`;
        return reply.send({
          status: 'ok',
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          db: 'connected',
          version: '1.0.0',
        });
      } catch (error) {
        return reply.status(503).send({
          status: 'error',
          db: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
}

export default routes;
