import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, TopUpStatus } from '.prisma/client';

interface ListTopUpsQuery {
  status?: TopUpStatus;
  user_id?: string;
  source_channel?: 'DIRECT' | 'WHITELABEL';
  sales_agency_uuid?: string;
  limit?: number;
  before?: string;
}

function buildTopUpWhere(
  status?: TopUpStatus,
  user_id?: string,
  source_channel?: 'DIRECT' | 'WHITELABEL',
  sales_agency_uuid?: string,
  before?: string,
) {
  return {
    ...(status !== undefined && { status }),
    ...(user_id !== undefined && { user_id }),
    ...(source_channel !== undefined && { source_channel }),
    ...(sales_agency_uuid !== undefined && { sales_agency_uuid }),
    ...(before !== undefined && { submitted_at: { lt: new Date(before) } }),
  };
}

async function fetchTopUps(prisma: PrismaClient, where: any, limit: number) {
  const data = await prisma.topUpRequests.findMany({
    where,
    orderBy: { submitted_at: 'desc' },
    take: limit + 1,
    include: {
      user: {
        select: {
          user_id: true,
          phone_number: true,
          agency_name: true,
          credit_balance: { select: { available_credits: true } },
        },
      },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });

  const hasMore = data.length > limit;
  const rawItems = hasMore ? data.slice(0, limit) : data;
  const items = rawItems.map((item: any) => ({
    ...item,
    user: item.user
      ? {
          ...item.user,
          available_credits: item.user.credit_balance?.available_credits?.toString?.() ?? '0.00',
          credit_balance: undefined,
        }
      : item.user,
  }));
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1].submitted_at.toISOString() : null;

  return { items, hasMore, nextCursor };
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListTopUpsQuery }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user as { userId: string; role: string | null };
  const {
    status,
    user_id,
    source_channel,
    sales_agency_uuid,
    limit: queryLimit = 20,
    before,
  } = request.query;

  const limit = Math.min(Number(queryLimit), 100);
  const scopedSalesAgencyUuid = caller.role === 'agency' ? caller.userId : sales_agency_uuid;
  const scopedSourceChannel = caller.role === 'agency' ? 'WHITELABEL' : source_channel;
  const where = buildTopUpWhere(
    status,
    user_id,
    scopedSourceChannel,
    scopedSalesAgencyUuid,
    before,
  );
  const { items, hasMore, nextCursor } = await fetchTopUps(prisma, where, limit);

  return reply.send({
    success: true,
    data: items,
    cursor: { nextCursor, hasMore, limit },
  });
}
