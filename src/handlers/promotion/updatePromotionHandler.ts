import { FastifyRequest, FastifyReply } from 'fastify';

interface UpdatePromotionParams {
  promotionId: string;
}

interface UpdatePromotionBody {
  name?: string;
  message?: string;
  credit_amount?: number;
  target_type?: 'all' | 'custom';
  user_ids?: string[];
}

export async function handler(
  request: FastifyRequest<{ Params: UpdatePromotionParams; Body: UpdatePromotionBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { promotionId } = request.params;
  const { name, message, credit_amount, target_type, user_ids } = request.body;

  const existing = await prisma.promotions.findUnique({
    where: { promotion_id: promotionId },
    select: { status: true },
  });

  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Promotion not found' });
  }

  if (existing.status !== 'draft') {
    return reply.status(409).send({
      success: false,
      message: 'Only draft promotions can be edited',
    });
  }

  if (credit_amount !== undefined && credit_amount <= 0) {
    return reply.status(400).send({ success: false, message: 'credit_amount must be positive' });
  }

  const newTargetType = target_type ?? undefined;
  const shouldReplaceTargets = user_ids !== undefined;

  // Guard: if switching to or staying on 'custom', require user_ids to be a non-empty list
  const effectiveTargetType = newTargetType ?? existing.target_type;
  if (effectiveTargetType === 'custom' && shouldReplaceTargets && user_ids!.length === 0) {
    return reply.status(400).send({
      success: false,
      message: 'user_ids must be non-empty when target_type is custom',
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (shouldReplaceTargets) {
      await tx.promotionUserTargets.deleteMany({ where: { promotion_id: promotionId } });
    }

    return tx.promotions.update({
      where: { promotion_id: promotionId },
      data: {
        ...(name !== undefined && { name }),
        ...(message !== undefined && { message }),
        ...(credit_amount !== undefined && { credit_amount }),
        ...(newTargetType !== undefined && { target_type: newTargetType }),
        ...(shouldReplaceTargets && newTargetType === 'custom' && user_ids!.length > 0
          ? { user_targets: { create: user_ids!.map((uid) => ({ user_id: uid })) } }
          : {}),
      },
      include: {
        _count: { select: { user_targets: true } },
      },
    });
  });

  return reply.send({ success: true, data: updated });
}
