import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, TopUpStatus } from '.prisma/client';

interface MyTopUpsQuery {
  status?: TopUpStatus;
  limit?: number;
  before?: string;
}

function buildMyTopUpWhere(userId: string, status?: TopUpStatus, before?: string) {
  return {
    user_id: userId,
    ...(status !== undefined && { status }),
    ...(before !== undefined && { submitted_at: { lt: new Date(before) } }),
  };
}

async function fetchMyTopUps(prisma: PrismaClient, where: any, limit: number) {
  const data = await prisma.topUpRequests.findMany({
    where,
    orderBy: { submitted_at: 'desc' },
    take: limit + 1,
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1].submitted_at.toISOString() : null;

  return { items, hasMore, nextCursor };
}

export async function handler(
  request: FastifyRequest<{ Querystring: MyTopUpsQuery }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { status, limit: queryLimit = 20, before } = request.query;

  const limit = Math.min(Number(queryLimit), 50);
  const where = buildMyTopUpWhere(caller.userId, status, before);
  const { items, hasMore, nextCursor } = await fetchMyTopUps(prisma, where, limit);

  return reply.send({
    success: true,
    data: items,
    cursor: { nextCursor, hasMore, limit },
  });
}
