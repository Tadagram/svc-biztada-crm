import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ServicePackagePurchaseStatus,
  UserRole,
  type Prisma,
} from '@prisma/client';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

interface CoreUserItem {
  id: string;
  telegram_id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  telegram_phone?: string | null;
  email?: string | null;
  is_premium: boolean;
  business_count: number;
  portal_count: number;
  worker_count: number;
  created_at: string;
}

interface CoreUserListResponse {
  success: boolean;
  data: {
    users: CoreUserItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

async function listPurchaseBasedCustomers(
  request: FastifyRequest<{
    Querystring: {
      limit?: string;
      offset?: string;
      search?: string;
      status?: 'active' | 'disabled' | 'deleted';
      lifecycle?: 'active' | 'new' | 'dormant';
    };
  }>,
  reply: FastifyReply,
) {
  const limit = parseInt(request.query.limit ?? '10', 10) || 10;
  const offset = parseInt(request.query.offset ?? '0', 10) || 0;
  const search = normalizeUserSearch(request.query.search ?? '');
  const status = request.query.status;
  const lifecycle = request.query.lifecycle;
  const caller = request.user as {
    userId: string;
    role: UserRole | null;
  };

  const isAdminOrMod = caller.role === null || caller.role === UserRole.mod;
  const isAgency = caller.role === UserRole.agency;

  if (!isAdminOrMod && !isAgency && caller.role !== UserRole.user) {
    return reply.status(403).send({ success: false, message: 'Forbidden' });
  }

  const isDeletedFilter = status === 'deleted';
  const deletedFilter: Prisma.UsersWhereInput = !status
    ? { deleted_at: null }
    : isDeletedFilter
      ? { deleted_at: { not: null } }
      : { deleted_at: null };

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  const lifecycleFilter: Prisma.UsersWhereInput = !lifecycle
    ? {}
    : lifecycle === 'active'
      ? { last_active_at: { not: null, gte: fourteenDaysAgo } }
      : lifecycle === 'new'
        ? { last_active_at: null, created_at: { gte: sevenDaysAgo } }
        : {
            OR: [
              { last_active_at: { not: null, lt: fourteenDaysAgo } },
              { last_active_at: null, created_at: { lt: sevenDaysAgo } },
            ],
          };

  const where: Prisma.UsersWhereInput = {
    ...deletedFilter,
    ...(search
      ? {
          OR: [
            { phone_number: { contains: search } },
            { agency_name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(!isDeletedFilter && status ? { status } : {}),
    ...lifecycleFilter,
    ...(caller.role === UserRole.user ? { user_id: caller.userId } : {}),
    service_package_purchases: {
      some: {
        status: ServicePackagePurchaseStatus.completed,
        ...(isAgency ? { seller_user_id: caller.userId } : {}),
      },
    },
  };

  const prisma = request.server.prisma;

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      select: {
        user_id: true,
        phone_number: true,
        agency_name: true,
        role: true,
        status: true,
        parent_user_id: true,
        last_active_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        credit_balance: {
          select: {
            available_credits: true,
          },
        },
      },
    }),
    prisma.users.count({ where }),
  ]);

  const userIds = users.map((u) => u.user_id);

  const [purchaseGroups, purchaseRows] = await Promise.all([
    userIds.length === 0
      ? []
      : prisma.servicePackagePurchases.groupBy({
          by: ['user_id'],
          where: {
            user_id: { in: userIds },
            status: ServicePackagePurchaseStatus.completed,
            ...(isAgency ? { seller_user_id: caller.userId } : {}),
          },
          _count: { _all: true },
        }),
    userIds.length === 0
      ? []
      : prisma.servicePackagePurchases.findMany({
          where: {
            user_id: { in: userIds },
            status: ServicePackagePurchaseStatus.completed,
          ...(isAgency ? { seller_user_id: caller.userId } : {}),
          },
          select: {
            user_id: true,
            purchased_at: true,
          },
          orderBy: { purchased_at: 'desc' },
        }),
  ]);

  const purchaseMeta = new Map<string, { completedCount: number }>();
  for (const group of purchaseGroups) {
    const existing = purchaseMeta.get(group.user_id) ?? { completedCount: 0 };

    existing.completedCount += group._count._all;
    purchaseMeta.set(group.user_id, existing);
  }

  const lastPurchaseAtByUser = new Map<string, Date>();
  for (const row of purchaseRows) {
    if (!lastPurchaseAtByUser.has(row.user_id)) {
      lastPurchaseAtByUser.set(row.user_id, row.purchased_at);
    }
  }

  const normalizedUsers = users.map((user) => {
    const purchase = purchaseMeta.get(user.user_id);

    return {
      ...user,
      credit_balance: undefined,
      available_credits: user.credit_balance?.available_credits?.toString?.() ?? '0.00',
      completed_purchase_count: purchase?.completedCount ?? 0,
      last_purchase_at: lastPurchaseAtByUser.get(user.user_id)?.toISOString() ?? null,
    };
  });

  return reply.send({
    data: normalizedUsers,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
      totalPages: Math.ceil(total / limit),
    },
  });
}

function normalizeUserSearch(raw: string): string {
  const value = raw.trim();
  if (!value) return '';

  const phoneLike = value.replace(/[^\d+]/g, '');
  const digitsOnly = phoneLike.replace(/\D/g, '');

  // Phone search normalization:
  // - keep alphanumeric queries as-is (username/name/email)
  // - for phone-like input, use trailing digits so local (0...) and intl (+84...) formats both match
  if (digitsOnly.length >= 9) {
    return digitsOnly.slice(-9);
  }

  return phoneLike || value;
}

export const handler = async (
  request: FastifyRequest<{
    Querystring: {
      limit?: string;
      offset?: string;
      search?: string;
      customer_mode?: string | boolean;
      status?: 'active' | 'disabled' | 'deleted';
      lifecycle?: 'active' | 'new' | 'dormant';
    };
  }>,
  reply: FastifyReply,
) => {
  const isCustomerMode =
    request.query.customer_mode === true || request.query.customer_mode === 'true';
  if (isCustomerMode) {
    return listPurchaseBasedCustomers(request, reply);
  }

  const limit = parseInt(request.query.limit ?? '10', 10) || 10;
  const offset = parseInt(request.query.offset ?? '0', 10) || 0;
  const search = normalizeUserSearch(request.query.search ?? '');

  const page = Math.floor(offset / limit) + 1;

  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(limit),
    });
    if (search) params.set('search', search);

    const res = await fetch(`${CORE_API_URL}/internal/users?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`svc-core-api responded ${res.status}`);
    }
    const json = (await res.json()) as CoreUserListResponse;

    const d = json.data;
    const users = (d.users ?? []).map((u: CoreUserItem) => ({
      user_id: u.id,
      telegram_id: u.telegram_id,
      phone_number: u.telegram_phone ?? '',
      first_name: u.first_name,
      last_name: u.last_name,
      username: u.username,
      email: u.email ?? null,
      is_premium: u.is_premium,
      business_count: u.business_count,
      portal_count: u.portal_count,
      worker_count: u.worker_count,
      role: null,
      status: 'active',
      created_at: u.created_at,
      updated_at: u.created_at,
    }));

    return reply.send({
      data: users,
      pagination: {
        total: d.total,
        limit,
        offset,
        pages: d.total_pages,
        totalPages: d.total_pages,
      },
    });
  } catch (err: unknown) {
    request.log.error({ err }, 'getCoreUsersHandler: failed to fetch from svc-core-api');
    return reply.status(502).send({ message: 'Failed to fetch users from core service' });
  }
};
