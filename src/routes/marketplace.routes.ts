import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  createMarketplaceListingHandler,
  getMarketplaceStateHandler,
  requestMarketplaceWithdrawalHandler,
} from '@handlers/marketplace';
import { handler as purchaseMarketplaceListingHandler } from '@handlers/marketplace/purchaseMarketplaceListingHandler';
import { handler as releaseTradeHandler } from '@handlers/marketplace/releaseTradeHandler';
import { handler as disputeTradeHandler } from '@handlers/marketplace/disputeTradeHandler';
import {
  createMarketplaceListingSchema,
  getMarketplaceStateSchema,
  requestMarketplaceWithdrawalSchema,
} from '@schemas/marketplace.schema';

async function marketplaceRoutes(fastify: FastifyInstance) {
  const userOnly = [fastify.authenticate];

  fastify.get(
    '/state',
    {
      schema: getMarketplaceStateSchema,
      preHandler: userOnly,
    },
    getMarketplaceStateHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/listings',
    {
      schema: createMarketplaceListingSchema,
      preHandler: userOnly,
    },
    createMarketplaceListingHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/listings/purchase',
    {
      preHandler: userOnly,
    },
    purchaseMarketplaceListingHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/withdrawals',
    {
      schema: requestMarketplaceWithdrawalSchema,
      preHandler: userOnly,
    },
    requestMarketplaceWithdrawalHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/trades/release',
    {
      preHandler: userOnly,
    },
    releaseTradeHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/trades/dispute',
    {
      preHandler: userOnly,
    },
    disputeTradeHandler as RouteHandlerMethod,
  );
}

export default marketplaceRoutes;
