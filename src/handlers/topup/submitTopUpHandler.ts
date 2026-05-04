import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { USER_ROLES, USER_STATUSES, TOPUP_STATUSES } from '@/utils/constants';
import topupEmitter from '@plugins/topupEmitter';
import { resolvePartnerContext } from '@/utils/partnerContext';
import { resolvePartnerSellerUserId } from '@/utils/resolvePartnerSeller';

interface SubmitTopUpBody {
  user_uuid: string;
  amount: number;
  currency?: 'VND' | 'USDT';
  seller_agency_uuid?: string | null;
  transfer_ref?: string | null;
}

const VND_TO_CREDIT_RATE = 2_600; // 2,600 VNĐ = 1 Tada Credit
const USDT_TO_CREDIT_RATE = 10; // 1 USDT = 10 Tada Credits

function generateTopUpCode(partnerId: string): string {
  const prefix = partnerId === 'soloai' ? 'SLA' : 'BTD';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function calcCreditAmount(amount: number, currency: 'VND' | 'USDT'): number {
  if (currency === 'VND') return Math.floor(amount / VND_TO_CREDIT_RATE);
  return Math.round(amount * USDT_TO_CREDIT_RATE * 100) / 100;
}

async function createTopUpRequest(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  currency: 'VND' | 'USDT',
  sourceChannel: 'DIRECT' | 'WHITELABEL',
  sellerAgencyUuid?: string | null,
  transferRef?: string | null,
) {
  return prisma.topUpRequests.create({
    data: {
      user_id: userId,
      amount,
      currency,
      credit_amount: calcCreditAmount(amount, currency),
      source_channel: sourceChannel,
      sales_agency_uuid: sellerAgencyUuid ?? null,
      transfer_ref: transferRef ?? null,
      proof_note: null,
      status: TOPUP_STATUSES.PENDING,
    },
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true } },
      reviewer: { select: { user_id: true, phone_number: true, agency_name: true } },
    },
  });
}

async function notifyModerators(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  currency: 'VND' | 'USDT',
  userPhone: string,
  partnerLabel: string,
  sellerAgencyUuid?: string | null,
) {
  const mods = await prisma.users.findMany({
    where: { role: USER_ROLES.MOD, status: USER_STATUSES.ACTIVE },
    select: { user_id: true },
  });

  if (mods.length > 0) {
    const credits = calcCreditAmount(amount, currency);
    const amountStr =
      currency === 'VND' ? amount.toLocaleString('vi-VN') + ' VNĐ' : amount.toFixed(4) + ' USDT';
    const creditsStr = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(credits);
    const sourceText = sellerAgencyUuid
      ? `${partnerLabel} · Seller ${sellerAgencyUuid}`
      : partnerLabel;
    await prisma.notifications.createMany({
      data: mods.map((mod) => ({
        recipient_id: mod.user_id,
        sender_id: userId,
        type: 'account_updated',
        title: 'Yêu cầu nạp tiền mới',
        body: `Người dùng ${userPhone} vừa yêu cầu nạp ${amountStr} (${creditsStr} credits), nguồn: ${sourceText}.`,
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
  const { amount, currency = 'USDT', seller_agency_uuid, transfer_ref } = request.body;
  const caller = request.user;
  const userId = caller.userId; // CRM user ID (FK-safe)
  const partnerContext = resolvePartnerContext(
    request.headers as Record<string, string | string[] | undefined>,
  );
  const resolvedSellerAgencyUuid = await resolvePartnerSellerUserId(
    prisma,
    partnerContext,
    seller_agency_uuid,
  );
  if (partnerContext.partnerId === 'soloai' && !resolvedSellerAgencyUuid) {
    return reply.status(400).send({
      success: false,
      message:
        'Missing seller_user_id mapping for soloai. Set x-seller-user-id or configure SOLOAI_SELLER_USER_ID/PARTNER_SELLER_MAP with seller UUID.',
    });
  }
  const sourceChannel = partnerContext.sourceChannel;
  const partnerLabel = partnerContext.partnerDomain || partnerContext.partnerId;
  const normalizedTransferRef = transfer_ref?.trim() || generateTopUpCode(partnerContext.partnerId);

  const topup = await createTopUpRequest(
    prisma,
    userId,
    amount,
    currency,
    sourceChannel,
    resolvedSellerAgencyUuid,
    normalizedTransferRef,
  );
  await notifyModerators(
    prisma,
    userId,
    amount,
    currency,
    topup.user.phone_number,
    partnerLabel,
    resolvedSellerAgencyUuid,
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
