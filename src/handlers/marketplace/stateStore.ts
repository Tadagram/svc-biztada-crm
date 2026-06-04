import { FastifyRequest } from 'fastify';

function sanitizeId(input?: string | null): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export function getBusinessIdFromRequest(request: FastifyRequest, bodyBusinessId?: string): string {
  const headerBusinessId = sanitizeId(request.headers['x-business-id']?.toString());
  const payloadBusinessId = sanitizeId(bodyBusinessId);
  return headerBusinessId ?? payloadBusinessId ?? 'default';
}

export async function fetchMarketplaceState(
  request: FastifyRequest,
  businessId: string,
  userId: string,
) {
  const listings = await request.prisma.marketplaceListings.findMany({
    where: { business_id: businessId },
    orderBy: { created_at: 'desc' },
  });

  const trades = await request.prisma.marketplaceTrades.findMany({
    where: {
      OR: [{ buyer_id: userId }, { seller_id: userId }],
    },
    orderBy: { created_at: 'desc' },
  });

  const withdrawals = await request.prisma.marketplaceWithdrawals.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  // Map to the frontend format
  return {
    listings: listings.map((l) => ({
      id: l.listing_id,
      title: l.title,
      type: l.type,
      seller: l.seller_id, // We should technically fetch seller name, but using ID for now
      credits: Number(l.credits),
      banner: l.banner,
      description: l.description,
      status: l.status,
      createdAt: l.created_at.toISOString(),
      updatedAt: l.updated_at.toISOString(),
    })),
    trades: trades.map((t) => ({
      id: t.trade_id,
      side: t.buyer_id === userId ? 'buy' : 'sell',
      title: 'Trade ' + t.order_ref, // We don't have listing title in trade directly without include
      counterparty: t.buyer_id === userId ? t.seller_id : t.buyer_id,
      credits: Number(t.credits),
      status: t.status,
      time: t.created_at.toISOString(),
      orderRef: t.order_ref,
    })),
    withdrawals: withdrawals.map((w) => ({
      id: w.withdrawal_id,
      amount: Number(w.amount),
      status: w.status,
      destination: w.destination,
      createdAt: w.created_at.toISOString(),
      requestRef: w.request_ref,
    })),
  };
}
