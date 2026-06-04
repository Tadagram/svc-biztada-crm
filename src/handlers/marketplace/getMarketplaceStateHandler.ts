import { FastifyReply, FastifyRequest } from 'fastify';
import { getBusinessIdFromRequest, fetchMarketplaceState } from './stateStore';

interface MarketplaceStateQuery {
  businessId?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: MarketplaceStateQuery }>,
  reply: FastifyReply,
) {
  const businessId = getBusinessIdFromRequest(request, request.query.businessId);
  const authUserId = (request.user as { userId?: string } | undefined)?.userId;

  if (!authUserId) {
    return reply.status(401).send({ success: false, message: 'Unauthorized' });
  }

  const snapshot = await fetchMarketplaceState(request, businessId, authUserId);

  return reply.send({
    success: true,
    data: snapshot,
    meta: {
      businessId,
      updatedAt: new Date().toISOString(),
    },
  });
}
