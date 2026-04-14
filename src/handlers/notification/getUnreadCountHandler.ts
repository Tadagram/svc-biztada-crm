import { FastifyRequest, FastifyReply } from 'fastify';

export async function getUnreadCountHandler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;
  const caller = request.user;

  const now = new Date();
  const count = await prisma.notifications.count({
    where: {
      recipient_id: caller.userId,
      is_read: false,
      OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    },
  });

  return reply.status(200).send({ success: true, count });
}
