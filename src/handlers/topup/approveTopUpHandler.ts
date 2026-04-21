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
        user: { select: { user_id: true, phone_number: true, agency_name: true } },
        reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
      },
    });

    const creditBalance = await tx.userCreditBalances.upsert({
      where: { user_id: updatedTopup.user_id },
      update: {
        available_credits: { increment: updatedTopup.credit_amount },
      },
      create: {
        user_id: updatedTopup.user_id,
        available_credits: updatedTopup.credit_amount,
      },
      select: { available_credits: true },
    });

    await tx.creditLedgerEntries.create({
      data: {
        user_id: updatedTopup.user_id,
        topup_id: updatedTopup.topup_id,
        entry_type: 'TOPUP_APPROVED',
        direction: 'CREDIT',
        amount: updatedTopup.credit_amount,
        balance_after: creditBalance.available_credits,
        purpose: 'Top-up approved',
        source_channel: updatedTopup.source_channel,
        sales_agency_uuid: updatedTopup.sales_agency_uuid,
        created_by: userId,
        metadata: {
          currency: updatedTopup.currency,
          amount_usdt: updatedTopup.amount.toString(),
          review_note: reviewNote ?? null,
        },
      },
    });

    return { updatedTopup, creditBalance, now };
  });
}

async function sendApprovalNotification(
  prisma: PrismaClient,
  userId: string,
  topupId: string,
  amount: any,
  creditedAmount: any,
  newCreditBalance: any,
  reviewerId: string,
) {
  const usdt = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const credits = Number(creditedAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  await prisma.notifications.create({
    data: {
      recipient_id: userId,
      sender_id: reviewerId,
      type: 'account_updated',
      title: '✅ Nạp tiền thành công',
      body: `Yêu cầu nạp ${usdt} USDT đã được duyệt. Bạn nhận ${credits} credits. Credit hiện tại: ${Number(newCreditBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      action_url: '/topup/me',
      custom_fields: {
        topup_id: topupId,
        amount: amount.toString(),
        credited_amount: creditedAmount.toString(),
        new_credit_balance: newCreditBalance.toString(),
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

  const { updatedTopup, creditBalance, now } = await approveTopUpTransaction(
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
    currency: updatedTopup.currency,
    credit_amount: updatedTopup.credit_amount.toString(),
    source_channel: updatedTopup.source_channel,
    sales_agency_uuid: updatedTopup.sales_agency_uuid ?? undefined,
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
    updatedTopup.credit_amount,
    creditBalance.available_credits,
    caller.userId,
  );

  return reply.send({
    success: true,
    data: updatedTopup,
    new_credit_balance: creditBalance.available_credits.toString(),
  });
}
