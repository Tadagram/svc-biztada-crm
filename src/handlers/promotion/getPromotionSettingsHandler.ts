import { FastifyRequest, FastifyReply } from 'fastify';

const NEW_USER_BONUS_KEY = 'new_user_bonus_credits';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;

  const record = await prisma.systemSettings.findUnique({
    where: { key: NEW_USER_BONUS_KEY },
  });

  return reply.send({
    new_user_bonus_credits: record ? Number(record.value) : 0,
    updated_at: record?.updated_at.toISOString() ?? null,
  });
}
