import { FastifyRequest, FastifyReply } from 'fastify';

interface GetPromotionParams {
  promotionId: string;
}

export async function handler(
  request: FastifyRequest<{ Params: GetPromotionParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { promotionId } = request.params;

  const promotion = await prisma.promotions.findUnique({
    where: { promotion_id: promotionId },
    include: {
      creator: { select: { user_id: true, phone_number: true, agency_name: true } },
      executor: { select: { user_id: true, phone_number: true, agency_name: true } },
      user_targets: {
        include: {
          user: { select: { user_id: true, phone_number: true, agency_name: true, role: true } },
        },
      },
      _count: { select: { execution_logs: true } },
    },
  });

  if (!promotion) {
    return reply.status(404).send({ success: false, message: 'Promotion not found' });
  }

  return reply.send({ data: promotion });
}
