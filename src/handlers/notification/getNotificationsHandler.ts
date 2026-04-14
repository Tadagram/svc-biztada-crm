import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationType } from '@prisma/client';

interface GetNotificationsQuerystring {
  limit?: number;
  /** Cursor: ISO timestamp of the oldest item from the previous page (exclusive) */
  before?: string;
  type?: NotificationType;
  is_read?: boolean;
}

export async function getNotificationsHandler(
  request: FastifyRequest<{ Querystring: GetNotificationsQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { limit: queryLimit = 10, before, type, is_read } = request.query;

  const limit = Math.min(Number(queryLimit), 50);

  const now = new Date();
  const where = {
    recipient_id: caller.userId,
    OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    ...(type !== undefined && { type }),
    ...(is_read !== undefined && {
      is_read: is_read === true || (is_read as unknown as string) === 'true',
    }),
    // Cursor: only load notifications older than the cursor timestamp
    ...(before !== undefined && {
      created_at: { lt: new Date(before) },
    }),
  };

  const data = await prisma.notifications.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit + 1, // fetch one extra to know if there's a next page
    include: {
      sender: {
        select: {
          user_id: true,
          agency_name: true,
          phone_number: true,
        },
      },
    },
  });

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  // next cursor = created_at of the last item returned
  const nextCursor = hasMore ? items[items.length - 1].created_at.toISOString() : null;

  return reply.status(200).send({
    success: true,
    data: items,
    cursor: {
      nextCursor,
      hasMore,
      limit,
    },
  });
}
