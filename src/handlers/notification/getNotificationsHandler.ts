import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, NotificationType } from '@prisma/client';

interface GetNotificationsQuerystring {
  limit?: number;
  /** Cursor: ISO timestamp of the oldest item from the previous page (exclusive) */
  before?: string;
  type?: NotificationType;
  is_read?: boolean;
}

function buildNotificationWhere(
  userId: string,
  type?: NotificationType,
  is_read?: boolean,
  before?: string,
) {
  const now = new Date();
  return {
    recipient_id: userId,
    OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    ...(type !== undefined && { type }),
    ...(is_read !== undefined && {
      is_read: is_read === true || (is_read as unknown as string) === 'true',
    }),
    ...(before !== undefined && {
      created_at: { lt: new Date(before) },
    }),
  };
}

async function fetchNotifications(prisma: PrismaClient, where: any, limit: number) {
  const data = await prisma.notifications.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit + 1,
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
  const nextCursor = hasMore ? items[items.length - 1].created_at.toISOString() : null;

  return { items, hasMore, nextCursor };
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetNotificationsQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { limit: queryLimit = 10, before, type, is_read } = request.query;

  const limit = Math.min(Number(queryLimit), 50);
  const where = buildNotificationWhere(caller.userId, type, is_read, before);
  const { items, hasMore, nextCursor } = await fetchNotifications(prisma, where, limit);

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
