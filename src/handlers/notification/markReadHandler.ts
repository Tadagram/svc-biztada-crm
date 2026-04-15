import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface MarkReadParams {
  notificationId: string;
}

async function getNotification(prisma: PrismaClient, notificationId: string) {
  return prisma.notifications.findUnique({
    where: { notification_id: notificationId },
  });
}

async function markNotificationAsRead(prisma: PrismaClient, notificationId: string) {
  return prisma.notifications.update({
    where: { notification_id: notificationId },
    data: { is_read: true, read_at: new Date() },
    include: {
      sender: {
        select: { user_id: true, agency_name: true, phone_number: true },
      },
    },
  });
}

export async function handler(
  request: FastifyRequest<{ Params: MarkReadParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { notificationId } = request.params;

  const existing = await getNotification(prisma, notificationId);

  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Notification not found' });
  }

  if (existing.recipient_id !== caller.userId) {
    return reply.status(403).send({ success: false, message: 'Forbidden' });
  }

  if (existing.is_read) {
    return reply.status(200).send({
      success: true,
      message: 'Already read',
      data: existing,
    });
  }

  const updated = await markNotificationAsRead(prisma, notificationId);

  return reply.status(200).send({
    success: true,
    message: 'Marked as read',
    data: updated,
  });
}
