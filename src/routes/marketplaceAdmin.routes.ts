import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { handler as adminApproveListingHandler } from '@handlers/marketplaceAdmin/adminApproveListingHandler';
import { handler as adminResolveDisputeHandler } from '@handlers/marketplaceAdmin/adminResolveDisputeHandler';
import { handler as adminApproveWithdrawalHandler } from '@handlers/marketplaceAdmin/adminApproveWithdrawalHandler';
import { handler as adminGetListingsHandler } from '@handlers/marketplaceAdmin/adminGetListingsHandler';
import { handler as adminGetTradesHandler } from '@handlers/marketplaceAdmin/adminGetTradesHandler';
import { handler as adminGetWithdrawalsHandler } from '@handlers/marketplaceAdmin/adminGetWithdrawalsHandler';

async function marketplaceAdminRoutes(fastify: FastifyInstance) {
  // We assume adminOnly requires 'admin' role, or a specific permission
  const adminOnly = [fastify.authenticate]; // Add permission guard if applicable in the future

  fastify.post(
    '/listings/approve',
    {
      preHandler: adminOnly,
    },
    adminApproveListingHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/trades/dispute/resolve',
    {
      preHandler: adminOnly,
    },
    adminResolveDisputeHandler as RouteHandlerMethod,
  );

  fastify.post(
    '/withdrawals/approve',
    {
      preHandler: adminOnly,
    },
    adminApproveWithdrawalHandler as RouteHandlerMethod,
  );

  fastify.get(
    '/listings',
    { preHandler: adminOnly },
    adminGetListingsHandler as RouteHandlerMethod,
  );

  fastify.get('/trades', { preHandler: adminOnly }, adminGetTradesHandler as RouteHandlerMethod);

  fastify.get(
    '/withdrawals',
    { preHandler: adminOnly },
    adminGetWithdrawalsHandler as RouteHandlerMethod,
  );
}

export default marketplaceAdminRoutes;
