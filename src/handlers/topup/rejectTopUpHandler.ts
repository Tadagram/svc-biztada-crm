import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { TOPUP_STATUSES } from '@/utils/constants';
import topupEmitter from '@plugins/topupEmitter';

interface RejectTopUpParams {
  topupId: string;
}
interface RejectTopUpBody {
  review_note?: string;
}

async function getTopUpRequest(prisma: PrismaClient, topupId: string) {
  return prisma.topUpRequests.findUnique({
    where: { topup_id: topupId },
  });
}

async function rejectTopUpRequest(
  prisma: PrismaClient,
  topupId: string,
  reviewerId: string,
  reviewNote?: string,
) {
  const now = new Date();
  return prisma.topUpRequests.update({
    where: { topup_id: topupId },
    data: {
      status: TOPUP_STATUSES.REJECTED,
      reviewed_by: reviewerId,
      reviewed_at: now,
      review_note: reviewNote ?? null,
    },
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });
}

async function sendRejectionNotification(
  prisma: PrismaClient,
  userId: string,
  topupId: string,
  amount: any,
  reviewerId: string,
  reviewNote?: string,
) {
  const amountStr = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  await prisma.notifications.create({
    data: {
      recipient_id: userId,
      sender_id: reviewerId,
      type: 'account_updated',
      title: '❌ Yêu cầu nạp tiền bị từ chối',
      body: reviewNote
        ? `Yêu cầu nạp ${amountStr} USD bị từ chối: ${reviewNote}`
        : `Yêu cầu nạp ${amountStr} USD không được duyệt.`,
      action_url: '/topup/me',
      custom_fields: {
        topup_id: topupId,
        amount: amount.toString(),
      },
    },
  });
}

export async function handler(
  request: FastifyRequest<{ Params: RejectTopUpParams; Body: RejectTopUpBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { topupId } = request.params;
  const { review_note } = request.body ?? {};

  const existing = await getTopUpRequest(prisma, topupId);

  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Yêu cầu nạp tiền không tồn tại' });
  }

  if (existing.status !== TOPUP_STATUSES.PENDING) {
    return reply.status(400).send({
      success: false,
      message: `Yêu cầu đã ở trạng thái ${existing.status}, không thể cập nhật`,
    });
  }

  const updated = await rejectTopUpRequest(prisma, topupId, caller.userId, review_note);
  const now = new Date();

  topupEmitter.emit('topup_event', {
    event: 'topup_rejected',
    topup_id: updated.topup_id,
    user_id: updated.user_id,
    amount: updated.amount.toString(),
    currency: updated.currency,
    credit_amount: updated.credit_amount.toString(),
    source_channel: updated.source_channel,
    sales_agency_uuid: updated.sales_agency_uuid ?? undefined,
    status: TOPUP_STATUSES.REJECTED,
    submitted_at: updated.submitted_at.toISOString(),
    reviewed_by: caller.userId,
    reviewed_at: now.toISOString(),
    review_note: review_note,
  });

  await sendRejectionNotification(
    prisma,
    existing.user_id,
    topupId,
    existing.amount,
    caller.userId,
    review_note,
  );

  return reply.send({ success: true, data: updated });
}
