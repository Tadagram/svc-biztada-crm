import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { TOPUP_STATUSES } from '@/utils/constants';
import topupEmitter from '@plugins/topupEmitter';

interface ApproveTopUpParams {
  topupId: string;
}
interface ApproveTopUpBody {
  review_note?: string;
}

async function getTopUpRequest(prisma: PrismaClient, topupId: string) {
  return prisma.topUpRequests.findUnique({
    where: { topup_id: topupId },
  });
}

async function approveTopUpTransaction(
  prisma: PrismaClient,
  topupId: string,
  userId: string,
  reviewNote?: string,
) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updatedTopup = await tx.topUpRequests.update({
      where: { topup_id: topupId },
      data: {
        status: TOPUP_STATUSES.APPROVED,
        reviewed_by: userId,
        reviewed_at: now,
        review_note: reviewNote ?? null,
      },
      include: {
        user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
        reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
      },
    });

    const updatedUser = await tx.users.update({
      where: { user_id: updatedTopup.user_id },
      data: { balance: { increment: updatedTopup.amount } },
      select: { balance: true },
    });

    return { updatedTopup, updatedUser, now };
  });
}

async function sendApprovalNotification(
  prisma: PrismaClient,
  userId: string,
  topupId: string,
  amount: any,
  newBalance: any,
  reviewerId: string,
) {
  await prisma.notifications.create({
    data: {
      recipient_id: userId,
      sender_id: reviewerId,
      type: 'account_updated',
      title: '✅ Nạp tiền thành công',
      body: `Yêu cầu nạp ${Number(amount).toLocaleString('vi-VN')}đ đã được duyệt. Số dư hiện tại: ${Number(newBalance).toLocaleString('vi-VN')}đ`,
      action_url: '/topup/me',
      custom_fields: {
        topup_id: topupId,
        amount: amount.toString(),
        new_balance: newBalance.toString(),
      },
    },
  });
}

export async function handler(
  request: FastifyRequest<{ Params: ApproveTopUpParams; Body: ApproveTopUpBody }>,
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
      message: `Yêu cầu đã ở trạng thái ${existing.status}, không thể duyệt lại`,
    });
  }

  const { updatedTopup, updatedUser, now } = await approveTopUpTransaction(
    prisma,
    topupId,
    caller.userId,
    review_note,
  );

  topupEmitter.emit('topup_event', {
    event: 'topup_approved',
    topup_id: updatedTopup.topup_id,
    user_id: updatedTopup.user_id,
    amount: updatedTopup.amount.toString(),
    status: TOPUP_STATUSES.APPROVED,
    submitted_at: updatedTopup.submitted_at.toISOString(),
    reviewed_by: caller.userId,
    reviewed_at: now.toISOString(),
    review_note: review_note,
  });

  await sendApprovalNotification(
    prisma,
    existing.user_id,
    topupId,
    existing.amount,
    updatedUser.balance,
    caller.userId,
  );

  return reply.send({
    success: true,
    data: updatedTopup,
    new_balance: updatedUser.balance.toString(),
  });
}
