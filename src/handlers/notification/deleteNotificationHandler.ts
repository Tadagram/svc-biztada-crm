import { FastifyRequest, FastifyReply } from 'fastify';

interface DeleteNotificationParams {
  notificationId: string;
}

export async function deleteNotificationHandler(
  request: FastifyRequest<{ Params: DeleteNotificationParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { notificationId } = request.params;

  const existing = await prisma.notifications.findUnique({
    where: { notification_id: notificationId },
  });

  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Notification not found' });
  }

  if (existing.recipient_id !== caller.userId) {
    return reply.status(403).send({ success: false, message: 'Forbidden' });
  }

  await prisma.notifications.delete({ where: { notification_id: notificationId } });

  return reply.status(200).send({ success: true, message: 'Notification deleted' });
}
