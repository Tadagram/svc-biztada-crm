import { FastifyRequest, FastifyReply } from 'fastify';
import { USER_ROLES, USER_STATUSES, TOPUP_STATUSES } from '@/utils/constants';
import topupEmitter from '@plugins/topupEmitter';

interface SubmitTopUpBody {
  amount: number;
  proof_note?: string;
}

export async function submitTopUpHandler(
  request: FastifyRequest<{ Body: SubmitTopUpBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { amount, proof_note } = request.body;

  const topup = await prisma.topUpRequests.create({
    data: {
      user_id: caller.userId,
      amount,
      proof_note: proof_note ?? null,
      status: TOPUP_STATUSES.PENDING,
    },
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });

  const amountStr = new Intl.NumberFormat('vi-VN').format(amount);

  // Notify all MODs
  const mods = await prisma.users.findMany({
    where: { role: USER_ROLES.MOD, status: USER_STATUSES.ACTIVE },
    select: { user_id: true },
  });

  if (mods.length > 0) {
    await prisma.notifications.createMany({
      data: mods.map((mod) => ({
        recipient_id: mod.user_id,
        sender_id: caller.userId,
        type: 'account_updated',
        title: 'Yêu cầu nạp tiền mới',
        body: `Người dùng ${topup.user.phone_number} vừa yêu cầu nạp ${amountStr}đ.`,
        action_url: '/topup/review',
      })),
    });
  }

  topupEmitter.emit('topup_event', {
    event: 'new_topup',
    topup_id: topup.topup_id,
    user_id: topup.user_id,
    amount: topup.amount.toString(),
    status: TOPUP_STATUSES.PENDING,
    submitted_at: topup.submitted_at.toISOString(),
  });

  return reply.status(201).send({ success: true, data: topup });
}
