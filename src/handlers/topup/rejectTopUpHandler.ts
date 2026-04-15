import { FastifyRequest, FastifyReply } from 'fastify';
import topupEmitter from '@plugins/topupEmitter';

interface RejectTopUpParams {
  topupId: string;
}
interface RejectTopUpBody {
  review_note?: string;
}

export async function rejectTopUpHandler(
  request: FastifyRequest<{ Params: RejectTopUpParams; Body: RejectTopUpBody }>,
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
      message: `Yêu cầu đã ở trạng thái ${existing.status}, không thể cập nhật`,
    });
  }

  const now = new Date();

  const updated = await prisma.topUpRequests.update({
    where: { topup_id: topupId },
    data: {
      status: 'REJECTED',
      reviewed_by: caller.userId,
      reviewed_at: now,
      review_note: review_note ?? null,
    },
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });

  // Broadcast rejection event
  topupEmitter.emit('topup_event', {
    event: 'topup_rejected',
    topup_id: updated.topup_id,
    user_id: updated.user_id,
    amount: updated.amount.toString(),
    status: 'REJECTED',
    submitted_at: updated.submitted_at.toISOString(),
    reviewed_by: caller.userId,
    reviewed_at: now.toISOString(),
    review_note: review_note,
  });

  // Notify user
  await prisma.notifications.create({
    data: {
      recipient_id: existing.user_id,
      sender_id: caller.userId,
      type: 'account_updated',
      title: '❌ Yêu cầu nạp tiền bị từ chối',
      body: review_note
        ? `Yêu cầu nạp ${Number(existing.amount).toLocaleString('vi-VN')}đ bị từ chối: ${review_note}`
        : `Yêu cầu nạp ${Number(existing.amount).toLocaleString('vi-VN')}đ không được duyệt.`,
      action_url: '/topup/me',
      custom_fields: {
        topup_id: topupId,
        amount: existing.amount.toString(),
      },
    },
  });

  return reply.send({ success: true, data: updated });
}
