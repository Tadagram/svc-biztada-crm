import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, TopUpStatus } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';
import { listPortalLicensesByBuyer } from '@services/corePortalLicenses';
import { listPortalWorkers } from '@services/corePortalWorkers';

type LicenseStatus = 'unused' | 'used' | 'expired';

function parsePurchaseId(noteRef?: string | null): string | null {
  if (!noteRef) return null;

  const match = noteRef.match(/crm_purchase[:#/-]([0-9a-fA-F-]{36})/);
  if (match?.[1]) {
    return match[1];
  }

  if (/^[0-9a-fA-F-]{36}$/.test(noteRef)) {
    return noteRef;
  }

  return null;
}

function deriveLicenseStatus(
  expiresAt: string | null,
  usedByPortalId: string | null,
): LicenseStatus {
  if (usedByPortalId) {
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return 'expired';
    }
    return 'used';
  }

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return 'expired';
  }
  return 'unused';
}

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

  let portalLicenses: Awaited<ReturnType<typeof listPortalLicensesByBuyer>>['data'] = [];
  try {
    const licensesPayload = await listPortalLicensesByBuyer({
      buyerUserId: userId,
      page: 1,
      pageSize: 100,
    });
    portalLicenses = licensesPayload.data;
  } catch (error) {
    request.log.warn({ err: error, userId }, 'Failed to fetch portal licenses for user insight');
  }

  let portalWorkers: Awaited<ReturnType<typeof listPortalWorkers>> = [];
  try {
    portalWorkers = await listPortalWorkers({ userId });
  } catch (error) {
    request.log.warn({ err: error, userId }, 'Failed to fetch portal workers for user insight');
  }

  const purchasesById = new Map<string, any>(
    purchases.map((purchase: any) => [purchase.service_package_purchase_id, purchase]),
  );

  const licenseItems = portalLicenses.map((license) => {
    const purchaseId = parsePurchaseId(license.issued_for_note);
    const purchase = purchaseId ? purchasesById.get(purchaseId) : null;
    const status = deriveLicenseStatus(license.expires_at, license.used_by_portal_id);

    return {
      key_id: license.id,
      license_key: license.license_key,
      status,
      expires_at: license.expires_at,
      activated_at: license.activated_at,
      used_by_portal_id: license.used_by_portal_id,
      purchase_id: purchaseId,
      product_code: purchase?.service_package.product_code ?? null,
      service_package_id: purchase?.service_package_id ?? null,
    };
  });

  const activeLicenseCount = licenseItems.filter((item) => item.status === 'used').length;
  const unusedLicenseCount = licenseItems.filter((item) => item.status === 'unused').length;
  const expiredLicenseCount = licenseItems.filter((item) => item.status === 'expired').length;

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
      portal_workers: {
        total_rows: portalWorkers.length,
        items: portalWorkers,
      },
    },
  });
}
