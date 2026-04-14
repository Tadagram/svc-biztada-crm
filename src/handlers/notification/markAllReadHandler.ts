import { FastifyRequest, FastifyReply } from 'fastify';

export async function markAllReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;
  const caller = request.user;

  const result = await prisma.notifications.updateMany({
    where: { recipient_id: caller.userId, is_read: false },
    data: { is_read: true, read_at: new Date() },
  });

  return reply.status(200).send({
    success: true,
    message: 'All notifications marked as read',
    updatedCount: result.count,
  });
}
