import { FastifyRequest, FastifyReply } from 'fastify';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;
  const caller = request.user;

  const balance = await prisma.userCreditBalances.findUnique({
    where: { user_id: caller.userId },
    select: { user_id: true, available_credits: true, updated_at: true },
  });

  return reply.send({
    success: true,
    data: {
      user_id: caller.userId,
      available_credits: balance?.available_credits?.toString() ?? '0.00',
      updated_at: balance?.updated_at?.toISOString() ?? null,
    },
  });
}
