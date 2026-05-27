import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getMarketProfileHandler } from '@handlers/strategyMarket';
import { getMarketProfileSchema } from '@schemas/strategyMarket.schema';
import { getActionPlanHandler } from '@handlers/strategyPlan';
import { getActionPlanSchema } from '@schemas/strategyPlan.schema';

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

  fastify.get(
    '/action-plan',
    {
      schema: getActionPlanSchema,
    },
    getActionPlanHandler as RouteHandlerMethod,
  );
}

export default strategyRoutes;
