import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface ListPurchasesQuery {
  page?: number;
  page_size?: number;
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListPurchasesQuery }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const caller = request.user as { userId: string; role: UserRole | null };
  const page = Math.max(1, Number(request.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.query.page_size) || 20));
  const skip = (page - 1) * pageSize;

  // Agency (seller) sees all purchases where they are the seller
  // Other roles (admin/mod) see all; regular user sees own purchases
  const isAgency = caller.role === USER_ROLES.AGENCY;
  const isAdminOrMod = caller.role === null || caller.role === USER_ROLES.MOD;

  const whereClause = isAgency
    ? { seller_user_id: caller.userId, status: 'completed' }
    : isAdminOrMod
      ? { status: 'completed' }
      : { user_id: caller.userId, status: 'completed' };

  const [total, purchases] = await Promise.all([
    prisma.servicePackagePurchases.count({
      where: whereClause,
    }),
    prisma.servicePackagePurchases.findMany({
      where: whereClause,
      include: {
        service_package: true,
      },
      orderBy: {
        purchased_at: 'desc',
      },
      skip,
      take: pageSize,
    }),
  ]);

  return reply.send({
    success: true,
    data: purchases.map((purchase: any) => ({
      purchase_id: purchase.service_package_purchase_id,
      service_package_id: purchase.service_package_id,
      product_code: purchase.service_package.product_code,
      type: purchase.service_package.type,
      status: purchase.status,
      channel: purchase.channel,
      seller_user_id: purchase.seller_user_id,
      license_key_count: purchase.license_key_count_snapshot,
      unit_price_usd: purchase.unit_price_usd.toString(),
      total_price_usd: purchase.total_price_usd.toString(),
      purchased_at: purchase.purchased_at.toISOString(),
      core_note_ref: purchase.core_note_ref,
      package: {
        price_per_month: purchase.service_package.price_per_month.toString(),
        facebook_personal_limit: purchase.service_package.facebook_personal_limit,
        facebook_fanpage_limit: purchase.service_package.facebook_fanpage_limit,
        zalo_limit: purchase.service_package.zalo_limit,
        tiktok_limit: purchase.service_package.tiktok_limit,
        telegram_limit: purchase.service_package.telegram_limit,
        bonus: purchase.service_package.bonus,
        community_support: purchase.service_package.community_support,
        support_24_7: purchase.service_package.support_24_7,
        is_popular: purchase.service_package.is_popular,
      },
    })),
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  });
}
