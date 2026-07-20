import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, TopUpStatus } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';
import { listPortalWorkers } from '@services/corePortalWorkers';

function buildWhereClause(
  userId: string,
  callerRole: UserRole,
  callerId: string,
  callerParentId?: string,
) {
  if (callerRole === USER_ROLES.AGENCY) {
    return { user_id: userId, parent_user_id: callerId };
  }
  if (callerRole === USER_ROLES.USER) {
    return {
      user_id: userId,
      OR: [{ user_id: callerId }, { parent_user_id: callerParentId ?? '' }],
    };
  }
  return { user_id: userId };
}

export async function handler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;
  const prisma = request.prisma as any;
  const caller = request.user as { userId: string; role: UserRole; parentUserId?: string };

  const whereClause = buildWhereClause(userId, caller.role, caller.userId, caller.parentUserId);
  const user = await prisma.users.findFirst({
    where: whereClause,
    select: {
      user_id: true,
      phone_number: true,
      role: true,
      status: true,
      parent_user_id: true,
      created_at: true,
    },
  });

  if (!user) {
    return reply.status(404).send({ success: false, message: 'User not found' });
  }

  const [topupAgg, purchaseAgg, purchases] = await Promise.all([
    prisma.topUpRequests.aggregate({
      where: { user_id: userId, status: TopUpStatus.APPROVED },
      _sum: { amount: true, credit_amount: true },
      _count: { _all: true },
    }),
    prisma.servicePackagePurchases.aggregate({
      where: { user_id: userId, status: 'completed' },
      _sum: { total_price_usd: true },
      _count: { _all: true },
    }),
    prisma.servicePackagePurchases.findMany({
      where: { user_id: userId, status: 'completed' },
      include: { service_package: true },
      orderBy: { purchased_at: 'desc' },
      take: 100,
    }),
  ]);

  const [
    topupHistoryRows,
    creditLedgerRows,
    creditBalanceRow,
    creditLedgerCreditAgg,
    creditLedgerDebitAgg,
  ] = await Promise.all([
    prisma.topUpRequests.findMany({
      where: { user_id: userId },
      orderBy: { submitted_at: 'desc' },
      take: 100,
    }),
    prisma.creditLedgerEntries.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        topup: {
          select: {
            topup_id: true,
            status: true,
            amount: true,
            currency: true,
            credit_amount: true,
          },
        },
      },
    }),
    prisma.userCreditBalances.findUnique({
      where: { user_id: userId },
      select: {
        available_credits: true,
        updated_at: true,
      },
    }),
    prisma.creditLedgerEntries.aggregate({
      where: { user_id: userId, direction: 'CREDIT' },
      _sum: { amount: true },
    }),
    prisma.creditLedgerEntries.aggregate({
      where: { user_id: userId, direction: 'DEBIT' },
      _sum: { amount: true },
    }),
  ]);

  let portalWorkers: Awaited<ReturnType<typeof listPortalWorkers>> = [];
  try {
    portalWorkers = await listPortalWorkers({ userId });
  } catch (error) {
    request.log.warn({ err: error, userId }, 'Failed to fetch portal workers for user insight');
  }

  const licenseItems: any[] = [];
  const activeLicenseCount = 0;
  const unusedLicenseCount = 0;
  const expiredLicenseCount = 0;

  const totalCredit = Number(creditLedgerCreditAgg._sum.amount ?? 0);
  const totalDebit = Number(creditLedgerDebitAgg._sum.amount ?? 0);

  const computedBalance = Math.max(0, totalCredit - totalDebit);
  const availableCredits =
    creditBalanceRow?.available_credits != null
      ? Number(creditBalanceRow.available_credits)
      : computedBalance;

  return reply.send({
    success: true,
    data: {
      user,
      financial_summary: {
        approved_topups_count: topupAgg._count._all,
        total_topup_amount_usd: Number(topupAgg._sum.amount ?? 0),
        total_topup_credits: Number(topupAgg._sum.credit_amount ?? 0),
        completed_purchases_count: purchaseAgg._count._all,
        total_purchase_amount_usd: Number(purchaseAgg._sum.total_price_usd ?? 0),
      },
      licenses: {
        total: licenseItems.length,
        active: activeLicenseCount,
        unused: unusedLicenseCount,
        expired: expiredLicenseCount,
        items: licenseItems,
      },
      purchase_history: purchases.map((purchase: any) => ({
        purchase_id: purchase.service_package_purchase_id,
        status: purchase.status,
        channel: purchase.channel,
        seller_user_id: purchase.seller_user_id,
        purchased_at: purchase.purchased_at,
        total_price_usd: Number(purchase.total_price_usd),
        unit_price_usd: Number(purchase.unit_price_usd),
        license_key_count: purchase.license_key_count_snapshot,
        product_code: purchase.service_package.product_code,
        service_package_id: purchase.service_package_id,
      })),
      topup_history: topupHistoryRows.map((topup: any) => ({
        topup_id: topup.topup_id,
        status: topup.status,
        amount: Number(topup.amount),
        currency: topup.currency,
        credit_amount: Number(topup.credit_amount),
        source_channel: topup.source_channel,
        sales_agency_uuid: topup.sales_agency_uuid,
        submitted_at: topup.submitted_at,
        reviewed_at: topup.reviewed_at,
        review_note: topup.review_note,
      })),
      credit_ledger: {
        available_credits: availableCredits,
        updated_at: creditBalanceRow?.updated_at ?? null,
        total_credit: totalCredit,
        total_debit: totalDebit,
        items: creditLedgerRows.map((entry: any) => ({
          credit_entry_id: entry.credit_entry_id,
          entry_type: entry.entry_type,
          direction: entry.direction,
          amount: Number(entry.amount),
          balance_after: Number(entry.balance_after),
          purpose: entry.purpose,
          source_channel: entry.source_channel,
          sales_agency_uuid: entry.sales_agency_uuid,
          created_at: entry.created_at,
          topup: entry.topup
            ? {
                topup_id: entry.topup.topup_id,
                status: entry.topup.status,
                amount: Number(entry.topup.amount),
                currency: entry.topup.currency,
                credit_amount: Number(entry.topup.credit_amount),
              }
            : null,
        })),
      },
      portal_workers: {
        total_rows: portalWorkers.length,
        items: portalWorkers,
      },
    },
  });
}
