import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { listPortalLicenses } from '@services/corePortalLicenses';
import { adminListPortalDevices } from '@services/corePortalDevices';

interface ListSystemLicenseKeysQuery {
  page?: number;
  page_size?: number;
}

function deriveStatus(
  expiresAt: string | null,
  usedByPortalId: string | null,
): 'unused' | 'used' | 'expired' {
  if (usedByPortalId) {
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired';
    return 'used';
  }
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired';
  return 'unused';
}

function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListSystemLicenseKeysQuery }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const caller = request.user as { userId: string; role: UserRole | null };
  const page = Math.max(1, Number(request.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.query.page_size) || 20));

  const isAdminOrMod = caller.role === UserRole.admin || caller.role === UserRole.mod;
  const isAgency = caller.role === UserRole.agency;
  if (!isAdminOrMod && !isAgency) {
    return reply.status(403).send({
      success: false,
      message: 'Only admin/mod/agency can access license management.',
    });
  }

  const coreResult = await listPortalLicenses({
    page,
    pageSize,
    ...(isAgency ? { sellerUserId: caller.userId } : {}),
  });

  const buyerIds = Array.from(
    new Set(
      coreResult.data.map((item) => item.buyer_user_id).filter((value): value is string => !!value),
    ),
  );

  const buyers = buyerIds.length
    ? await prisma.users.findMany({
        where: {
          user_id: { in: buyerIds },
        },
        select: {
          user_id: true,
          phone_number: true,
          agency_name: true,
        },
      })
    : [];

  const buyersMap = new Map<string, { phone_number: string; agency_name: string | null }>(
    buyers.map((buyer: any) => [buyer.user_id, buyer]),
  );

  const usedPortalIds = Array.from(
    new Set(
      coreResult.data
        .map((item) => item.used_by_portal_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const portalMap = new Map<string, { device_name: string | null; telegram_id: number }>();
  if (usedPortalIds.length > 0) {
    const portalLists = await Promise.all(
      usedPortalIds.map(async (portalId) => {
        try {
          const result = await adminListPortalDevices({ page: 1, limit: 20, search: portalId });
          return result.data;
        } catch {
          return [];
        }
      }),
    );

    for (const list of portalLists) {
      for (const portal of list) {
        if (!portalMap.has(portal.id)) {
          portalMap.set(portal.id, {
            device_name: portal.device_name,
            telegram_id: portal.telegram_id,
          });
        }
      }
    }
  }

  return reply.send({
    success: true,
    data: coreResult.data.map((item) => {
      const buyer = item.buyer_user_id ? buyersMap.get(item.buyer_user_id) : null;
      const portal = item.used_by_portal_id ? portalMap.get(item.used_by_portal_id) : null;
      return {
        core_license_key_id: item.id,
        license_key: item.license_key,
        status: deriveStatus(item.expires_at, item.used_by_portal_id),
        is_used: Boolean(item.used_by_portal_id),
        expires_at: item.expires_at,
        days_remaining: getDaysRemaining(item.expires_at),
        activated_at: item.activated_at,
        buyer_user_id: item.buyer_user_id,
        buyer_phone_number: buyer?.phone_number ?? null,
        buyer_agency_name: buyer?.agency_name ?? null,
        seller_user_id: item.seller_user_id,
        used_by_portal_id: item.used_by_portal_id,
        used_portal_device_name: portal?.device_name ?? null,
        used_portal_telegram_id: portal?.telegram_id ?? null,
        created_at: item.created_at,
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
