import { FastifyRequest, FastifyReply } from 'fastify';

type ServicePackageType = 'personal' | 'enterprise';

interface ListServicePackagesQuery {
  type?: ServicePackageType;
  include_inactive?: boolean;
}

const DEFAULT_SERVICE_PACKAGES = [
  {
    product_code: 'CLOUD_VM_30_DAYS',
    price_per_month: 20,
    license_key_count: 1,
    account_limit: 999999,
    ai_query_quota: 0,
    bonus: null,
    agent_discount_percent: 0,
    community_support: true,
    support_24_7: true,
    type: 'personal' as ServicePackageType,
    is_popular: false,
    sort_order: 1,
  },
  {
    product_code: 'CLOUD_VM_90_DAYS',
    price_per_month: 50,
    license_key_count: 1,
    account_limit: 999999,
    ai_query_quota: 0,
    bonus: null,
    agent_discount_percent: 0,
    community_support: true,
    support_24_7: true,
    type: 'personal' as ServicePackageType,
    is_popular: false,
    sort_order: 2,
  },
  {
    product_code: 'CLOUD_VM_180_DAYS',
    price_per_month: 100,
    license_key_count: 1,
    account_limit: 999999,
    ai_query_quota: 0,
    bonus: null,
    agent_discount_percent: 0,
    community_support: true,
    support_24_7: true,
    type: 'personal' as ServicePackageType,
    is_popular: true,
    sort_order: 3,
  },
  {
    product_code: 'CLOUD_VM_365_DAYS',
    price_per_month: 200,
    license_key_count: 1,
    account_limit: 999999,
    ai_query_quota: 0,
    bonus: 'Tặng tài khoản Gemini Pro 1 năm',
    agent_discount_percent: 0,
    community_support: true,
    support_24_7: true,
    type: 'personal' as ServicePackageType,
    is_popular: true,
    sort_order: 4,
  },
];

async function ensureDefaultServicePackages(prisma: any) {
  for (const item of DEFAULT_SERVICE_PACKAGES) {
    const existing = await prisma.servicePackages.findUnique({
      where: { product_code: item.product_code },
    });
    if (!existing) {
      await prisma.servicePackages.create({
        data: {
          product_code: item.product_code,
          price_per_month: item.price_per_month,
          ai_query_quota: item.ai_query_quota || 0,
          bonus: item.bonus,
          community_support: item.community_support,
          support_24_7: item.support_24_7,
          type: item.type,
          is_popular: item.is_popular,
          sort_order: item.sort_order,
          is_active: true,
        },
      });
    }
  }
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
