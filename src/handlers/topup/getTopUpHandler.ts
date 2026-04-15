import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface GetTopUpParams {
  topupId: string;
}

async function getTopUp(prisma: PrismaClient, topupId: string) {
  return prisma.topUpRequests.findUnique({
    where: { topup_id: topupId },
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });
}

export async function handler(
  request: FastifyRequest<{ Params: GetTopUpParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { topupId } = request.params;

  const topup = await getTopUp(prisma, topupId);

  if (!topup) {
    return reply.status(404).send({ success: false, message: 'Yêu cầu nạp tiền không tồn tại' });
  }

  const isMod = caller.role === USER_ROLES.MOD;
  if (!isMod && topup.user_id !== caller.userId) {
    return reply.status(403).send({ success: false, message: 'Không có quyền xem yêu cầu này' });
  }

  return reply.send({ success: true, data: topup });
}
