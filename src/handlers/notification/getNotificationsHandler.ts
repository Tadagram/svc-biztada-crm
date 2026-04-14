import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationType } from '@prisma/client';

interface GetNotificationsQuerystring {
  limit?: number;
  offset?: number;
  type?: NotificationType;
  is_read?: boolean;
}

export async function getNotificationsHandler(
  request: FastifyRequest<{ Querystring: GetNotificationsQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { limit: queryLimit = 20, offset: queryOffset = 0, type, is_read } = request.query;

  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  const now = new Date();
  const where = {
    recipient_id: caller.userId,
    // Hide expired notifications
    OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    ...(type !== undefined && { type }),
    ...(is_read !== undefined && {
      is_read: is_read === true || (is_read as unknown as string) === 'true',
    }),
  };

  const [data, total] = await Promise.all([
    prisma.notifications.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        sender: {
          select: {
            user_id: true,
            agency_name: true,
            phone_number: true,
          },
        },
      },
    }),
    prisma.notifications.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return reply.status(200).send({
    success: true,
    data,
    pagination: { total, limit, offset, totalPages, currentPage },
  });
}
