import { FastifyRequest, FastifyReply } from 'fastify';

interface DeletePromotionParams {
  promotionId: string;
}

export async function handler(
  request: FastifyRequest<{ Params: DeletePromotionParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { promotionId } = request.params;

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
      message: 'Only draft promotions can be deleted',
    });
  }

  await prisma.$transaction([
    prisma.promotionUserTargets.deleteMany({ where: { promotion_id: promotionId } }),
    prisma.promotions.delete({ where: { promotion_id: promotionId } }),
  ]);

  return reply.send({ success: true });
}
