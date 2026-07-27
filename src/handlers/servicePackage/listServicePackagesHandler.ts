import { FastifyRequest, FastifyReply } from 'fastify';

type ServicePackageType = 'personal' | 'enterprise';

interface ListServicePackagesQuery {
  type?: ServicePackageType;
  include_inactive?: boolean;
}

const DEFAULT_SERVICE_PACKAGES = [
  {
    product_code: 'PERSONAL_20',
    price_per_month: 20,
    ai_query_quota: 500,
    bonus: null,
    community_support: true,
    support_24_7: false,
    type: 'personal' as ServicePackageType,
    is_popular: false,
    sort_order: 10,
  },
  {
    product_code: 'PERSONAL_40',
    price_per_month: 40,
    ai_query_quota: 1200,
    bonus: null,
    community_support: true,
    support_24_7: false,
    type: 'personal' as ServicePackageType,
    is_popular: true,
    sort_order: 20,
  },
];

async function ensureDefaultServicePackages(prisma: any) {
  const count = await prisma.servicePackages.count();
  if (count > 0) return;

  await prisma.servicePackages.createMany({
    data: DEFAULT_SERVICE_PACKAGES.map((item) => {
      return {
        product_code: item.product_code,
        price_per_month: item.price_per_month,
        ai_query_quota: item.ai_query_quota,
        bonus: item.bonus,
        community_support: item.community_support,
        support_24_7: item.support_24_7,
        type: item.type,
        is_popular: item.is_popular,
        sort_order: item.sort_order,
        is_active: true,
      };
    }),
    skipDuplicates: true,
  });
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListServicePackagesQuery }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const { type, include_inactive } = request.query;

  await ensureDefaultServicePackages(prisma);

  const packages = await prisma.servicePackages.findMany({
    where: {
      ...(include_inactive ? {} : { is_active: true }),
      ...(type ? { type } : {}),
    },
    orderBy: [{ sort_order: 'asc' }, { price_per_month: 'asc' }],
  });

  return reply.send({
    success: true,
    data: packages.map((item: any) => {
      return {
        service_package_id: item.service_package_id,
        product_code: item.product_code,
        price_per_month: item.price_per_month.toString(),
        ai_query_quota: item.ai_query_quota,
        bonus: item.bonus,
        community_support: item.community_support,
        support_24_7: item.support_24_7,
        type: item.type,
        is_popular: item.is_popular,
        sort_order: item.sort_order,
        is_active: item.is_active,
      };
    }),
  });
}
