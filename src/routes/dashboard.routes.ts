import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { handler as getRevenueHandler } from '@handlers/dashboard/getRevenueHandler';
import { getRevenueSchema } from '@schemas/dashboard.schema';

async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/revenue',
    {
      schema: getRevenueSchema,
      preHandler: [fastify.authenticate],
    },
    getRevenueHandler as RouteHandlerMethod,
  );
}

export default dashboardRoutes;
