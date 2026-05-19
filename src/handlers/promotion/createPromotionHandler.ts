import { FastifyRequest, FastifyReply } from 'fastify';

interface CreatePromotionBody {
  name: string;
  message: string;
  credit_amount: number;
  target_type: 'all' | 'custom';
  user_ids?: string[];
}

export async function handler(
  request: FastifyRequest<{ Body: CreatePromotionBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { name, message, credit_amount, target_type, user_ids = [] } = request.body;

  if (credit_amount <= 0) {
    return reply.status(400).send({ success: false, message: 'credit_amount must be positive' });
  }

  if (target_type === 'custom' && user_ids.length === 0) {
    return reply.status(400).send({
      success: false,
      message: 'user_ids required when target_type is custom',
    });
  }

  const promotion = await prisma.promotions.create({
    data: {
      name,
      message,
      credit_amount,
      target_type,
      created_by: caller.userId,
      user_targets:
        target_type === 'custom'
          ? { create: user_ids.map((uid) => ({ user_id: uid })) }
          : undefined,
    },
    include: {
      _count: { select: { user_targets: true } },
    },
  });

  return reply.status(201).send({ success: true, data: promotion });
}
