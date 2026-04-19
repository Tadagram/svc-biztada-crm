import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { USER_ROLES, USER_STATUSES, TOPUP_STATUSES } from '@/utils/constants';
import topupEmitter from '@plugins/topupEmitter';

interface SubmitTopUpBody {
  amount: number;
  source_channel?: 'DIRECT' | 'WHITELABEL';
  sales_agency_uuid?: string;
  proof_note?: string;
}

async function createTopUpRequest(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  sourceChannel: 'DIRECT' | 'WHITELABEL',
  salesAgencyUuid?: string,
  proof_note?: string,
) {
  return prisma.topUpRequests.create({
    data: {
      user_id: userId,
      amount,
      currency: 'USD',
      credit_amount: amount,
      source_channel: sourceChannel,
      sales_agency_uuid: sourceChannel === 'WHITELABEL' ? (salesAgencyUuid ?? null) : null,
      proof_note: proof_note ?? null,
      status: TOPUP_STATUSES.PENDING,
    },
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true, balance: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });
}

async function notifyModerators(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  userPhone: string,
  sourceChannel: 'DIRECT' | 'WHITELABEL',
  salesAgencyUuid?: string,
) {
  const mods = await prisma.users.findMany({
    where: { role: USER_ROLES.MOD, status: USER_STATUSES.ACTIVE },
    select: { user_id: true },
  });

  if (mods.length > 0) {
    const amountStr = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    const sourceText =
      sourceChannel === 'WHITELABEL'
        ? `White-label${salesAgencyUuid ? ` (${salesAgencyUuid})` : ''}`
        : 'biztada.com';
    await prisma.notifications.createMany({
      data: mods.map((mod) => ({
        recipient_id: mod.user_id,
        sender_id: userId,
        type: 'account_updated',
        title: 'Yêu cầu nạp tiền mới',
        body: `Người dùng ${userPhone} vừa yêu cầu nạp ${amountStr} USD (${amountStr} credits), nguồn: ${sourceText}.`,
        action_url: '/topup/review',
      })),
    });
  }
}

export async function handler(
  request: FastifyRequest<{ Body: SubmitTopUpBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { amount, source_channel, sales_agency_uuid, proof_note } = request.body;
  const sourceChannel = source_channel ?? 'DIRECT';

  if (sourceChannel === 'WHITELABEL' && !sales_agency_uuid) {
    return reply.status(400).send({
      success: false,
      message: 'sales_agency_uuid là bắt buộc khi source_channel = WHITELABEL',
    });
  }

  const topup = await createTopUpRequest(
    prisma,
    caller.userId,
    amount,
    sourceChannel,
    sales_agency_uuid,
    proof_note,
  );
  await notifyModerators(
    prisma,
    caller.userId,
    amount,
    topup.user.phone_number,
    sourceChannel,
    sales_agency_uuid,
  );

  topupEmitter.emit('topup_event', {
    event: 'new_topup',
    topup_id: topup.topup_id,
    user_id: topup.user_id,
    amount: topup.amount.toString(),
    currency: topup.currency,
    credit_amount: topup.credit_amount.toString(),
    source_channel: topup.source_channel,
    sales_agency_uuid: topup.sales_agency_uuid ?? undefined,
    status: TOPUP_STATUSES.PENDING,
    submitted_at: topup.submitted_at.toISOString(),
  });

  return reply.status(201).send({ success: true, data: topup });
}
