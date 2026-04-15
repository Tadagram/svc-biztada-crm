import { FastifyRequest, FastifyReply } from 'fastify';
import topupEmitter from '@plugins/topupEmitter';

interface ApproveTopUpParams {
  topupId: string;
}
interface ApproveTopUpBody {
  review_note?: string;
}

export async function approveTopUpHandler(
  request: FastifyRequest<{ Params: ApproveTopUpParams; Body: ApproveTopUpBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { topupId } = request.params;
  const { review_note } = request.body ?? {};

  const existing = await prisma.topUpRequests.findUnique({
    where: { topup_id: topupId },
  });

  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Yêu cầu nạp tiền không tồn tại' });
  }

  if (existing.status !== 'PENDING') {
    return reply.status(400).send({
      success: false,
      message: `Yêu cầu đã ở trạng thái ${existing.status}, không thể duyệt lại`,
    });
  }

  const now = new Date();

  // Atomic transaction: update topup + increment user balance
  const [updatedTopup, updatedUser] = await prisma.$transaction([
    prisma.topUpRequests.update({
      where: { topup_id: topupId },
      data: {
        status: 'APPROVED',
        reviewed_by: caller.userId,
        reviewed_at: now,
        review_note: review_note ?? null,
      },
      include: {
        user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
        reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
      },
    }),
    prisma.users.update({
      where: { user_id: existing.user_id },
      data: { balance: { increment: existing.amount } },
      select: { balance: true },
    }),
  ]);

  // Broadcast approval event
  topupEmitter.emit('topup_event', {
    event: 'topup_approved',
    topup_id: updatedTopup.topup_id,
    user_id: updatedTopup.user_id,
    amount: updatedTopup.amount.toString(),
    status: 'APPROVED',
    submitted_at: updatedTopup.submitted_at.toISOString(),
    reviewed_by: caller.userId,
    reviewed_at: now.toISOString(),
    review_note: review_note,
  });

  // Send in-app notification to user
  await prisma.notifications.create({
    data: {
      recipient_id: existing.user_id,
      sender_id: caller.userId,
      type: 'account_updated',
      title: '✅ Nạp tiền thành công',
      body: `Yêu cầu nạp ${Number(existing.amount).toLocaleString('vi-VN')}đ đã được duyệt. Số dư hiện tại: ${Number(updatedUser.balance).toLocaleString('vi-VN')}đ`,
      action_url: '/topup/me',
      custom_fields: {
        topup_id: topupId,
        amount: existing.amount.toString(),
        new_balance: updatedUser.balance.toString(),
      },
    },
  });

  return reply.send({
    success: true,
    data: updatedTopup,
    new_balance: updatedUser.balance.toString(),
  });
}
