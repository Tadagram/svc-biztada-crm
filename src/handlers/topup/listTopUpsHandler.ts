import { FastifyRequest, FastifyReply } from 'fastify';
import { TopUpStatus } from '.prisma/client';

interface ListTopUpsQuery {
  status?: TopUpStatus;
  user_id?: string;
  limit?: number;
  before?: string;
}

export async function listTopUpsHandler(
  request: FastifyRequest<{ Querystring: ListTopUpsQuery }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { status, user_id, limit: queryLimit = 20, before } = request.query;

  const limit = Math.min(Number(queryLimit), 100);

  const data = await prisma.topUpRequests.findMany({
    where: {
      ...(status !== undefined && { status }),
      ...(user_id !== undefined && { user_id }),
      ...(before !== undefined && { submitted_at: { lt: new Date(before) } }),
    },
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

  return reply.send({
    success: true,
    data: items,
    cursor: { nextCursor, hasMore, limit },
  });
}
