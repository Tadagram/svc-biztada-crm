import { FastifyRequest, FastifyReply } from 'fastify';

const NEW_USER_BONUS_KEY = 'new_user_bonus_credits';

interface UpdatePromotionSettingsBody {
  new_user_bonus_credits: number;
}

export async function handler(
  request: FastifyRequest<{ Body: UpdatePromotionSettingsBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { new_user_bonus_credits } = request.body;

  if (new_user_bonus_credits < 0) {
    return reply.status(400).send({ success: false, message: 'Credit amount must be non-negative' });
  }

  const record = await prisma.systemSettings.upsert({
    where: { key: NEW_USER_BONUS_KEY },
    update: { value: String(new_user_bonus_credits) },
    create: { key: NEW_USER_BONUS_KEY, value: String(new_user_bonus_credits) },
  });

  return reply.send({
    success: true,
    new_user_bonus_credits: Number(record.value),
    updated_at: record.updated_at.toISOString(),
  });
}
