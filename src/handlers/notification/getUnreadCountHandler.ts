import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

async function getUnreadCount(prisma: PrismaClient, userId: string) {
  const now = new Date();
  return prisma.notifications.count({
    where: {
      recipient_id: userId,
      is_read: false,
      OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    },
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;
  const caller = request.user;

  const count = await getUnreadCount(prisma, caller.userId);

  return reply.status(200).send({ success: true, count });
}
