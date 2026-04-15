import { FastifyRequest, FastifyReply } from 'fastify';

interface GetTopUpParams {
  topupId: string;
}

export async function getTopUpHandler(
  request: FastifyRequest<{ Params: GetTopUpParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { topupId } = request.params;

  const topup = await prisma.topUpRequests.findUnique({
    where: { topup_id: topupId },
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });

  if (!topup) {
    return reply.status(404).send({ success: false, message: 'Yêu cầu nạp tiền không tồn tại' });
  }

  // User can only see their own; reviewer (mod) can see all
  const isMod = caller.role === 'mod';
  if (!isMod && topup.user_id !== caller.userId) {
    return reply.status(403).send({ success: false, message: 'Không có quyền xem yêu cầu này' });
  }

  return reply.send({ success: true, data: topup });
}
