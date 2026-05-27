import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getMarketProfileHandler } from '@handlers/strategyMarket';
import { getMarketProfileSchema } from '@schemas/strategyMarket.schema';

async function strategyRoutes(fastify: FastifyInstance) {
  // Public endpoint: no auth required.
  // If user/business context is missing, handler returns demo dataset.
  fastify.get(
    '/market-profile',
    {
      schema: getMarketProfileSchema,
    },
    getMarketProfileHandler as RouteHandlerMethod,
  );
}

export default strategyRoutes;
