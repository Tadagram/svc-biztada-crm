import { FastifyReply, FastifyRequest } from 'fastify';
import { listPortalLicensesByBuyer } from '@services/corePortalLicenses';

interface ListLicenseKeysQuery {
  page?: number;
  page_size?: number;
}

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

function deriveStatus(
  expiresAt: string | null,
  usedByPortalId: string | null,
): 'unused' | 'used' | 'expired' {
  if (usedByPortalId) {
    return 'used';
  }
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return 'expired';
  }
  return 'unused';
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListLicenseKeysQuery }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const caller = request.user;
  const page = Math.max(1, Number(request.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.query.page_size) || 20));

  const coreResult = await listPortalLicensesByBuyer({
    buyerUserId: caller.userId,
    page,
    pageSize,
  });

  const purchaseIds = Array.from(
    new Set(
      coreResult.data
        .map((item) => parsePurchaseId(item.issued_for_note))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const purchases = purchaseIds.length
    ? await prisma.servicePackagePurchases.findMany({
        where: {
          service_package_purchase_id: { in: purchaseIds },
        },
        include: {
          service_package: true,
        },
      })
    : [];

  const purchasesById = new Map<string, any>(
    purchases.map((purchase: any) => [purchase.service_package_purchase_id, purchase]),
  );

  return reply.send({
    success: true,
    data: coreResult.data.map((item) => {
      const purchaseId = parsePurchaseId(item.issued_for_note);
      const purchase = purchaseId ? purchasesById.get(purchaseId) : undefined;
      const status = deriveStatus(item.expires_at, item.used_by_portal_id);

      return {
        core_license_key_id: item.id,
        purchase_id: purchaseId,
        license_key: item.license_key,
        status,
        expires_at: item.expires_at,
        activated_at: item.activated_at,
        used_by_portal_id: item.used_by_portal_id,
        seller_user_id: item.seller_user_id,
        channel: purchase?.channel ?? (item.seller_user_id ? 'agency' : 'direct'),
        purchased_at: purchase?.purchased_at?.toISOString() ?? item.created_at,
        service_package: purchase
          ? {
              service_package_id: purchase.service_package.service_package_id,
              product_code: purchase.service_package.product_code,
              type: purchase.service_package.type,
              license_key_count: purchase.service_package.license_key_count,
              price_per_month: purchase.service_package.price_per_month.toString(),
              facebook_personal_limit: purchase.service_package.facebook_personal_limit,
              facebook_fanpage_limit: purchase.service_package.facebook_fanpage_limit,
              zalo_limit: purchase.service_package.zalo_limit,
              tiktok_limit: purchase.service_package.tiktok_limit,
              telegram_limit: purchase.service_package.telegram_limit,
            }
          : null,
      };
    }),
    pagination: {
      page: coreResult.page,
      page_size: coreResult.page_size,
      total: coreResult.total,
      total_pages: Math.ceil(coreResult.total / coreResult.page_size),
    },
  });
}
