import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getMarketProfileHandler } from '@handlers/strategyMarket';
import { getMarketProfileSchema } from '@schemas/strategyMarket.schema';
import { getActionPlanHandler } from '@handlers/strategyPlan';
import { getActionPlanSchema } from '@schemas/strategyPlan.schema';
import { getFeaturesHandler } from '@handlers/strategyFeatures';
import { getFeaturesSchema } from '@schemas/strategyFeatures.schema';
import { getMatrixHandler } from '@handlers/strategyMatrix';
import { getMatrixSchema } from '@schemas/strategyMatrix.schema';
import { getFactoryHandler } from '@handlers/strategyFactory';
import { getFactorySchema } from '@schemas/strategyFactory.schema';

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

  fastify.get(
    '/features',
    {
      schema: getFeaturesSchema,
    },
    getFeaturesHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/matrix',
    {
      schema: getMatrixSchema,
    },
    getMatrixHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/factory',
    {
      schema: getFactorySchema,
    },
    getFactoryHandler as RouteHandlerMethod,
  );
}
export default strategyRoutes;
