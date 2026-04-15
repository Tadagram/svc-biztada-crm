import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

async function markAllAsRead(prisma: PrismaClient, userId: string) {
  return prisma.notifications.updateMany({
    where: { recipient_id: userId, is_read: false },
    data: { is_read: true, read_at: new Date() },
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;
  const caller = request.user;

  const result = await markAllAsRead(prisma, caller.userId);

  return reply.status(200).send({
    success: true,
    message: 'All notifications marked as read',
    updatedCount: result.count,
  });
}
