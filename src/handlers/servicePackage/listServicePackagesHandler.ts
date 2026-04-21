import { FastifyRequest, FastifyReply } from 'fastify';

type ServicePackageType = 'personal' | 'enterprise';

interface ListServicePackagesQuery {
  type?: ServicePackageType;
}

function calcBonusLicenseCount(
  baseCount: number,
  bonusPercent: number,
  packageType: ServicePackageType,
): number {
  if (packageType !== 'enterprise' || bonusPercent <= 0 || baseCount <= 0) {
    return 0;
  }

  return Math.ceil((baseCount * bonusPercent) / 100);
}

const DEFAULT_SERVICE_PACKAGES = [
  {
    product_code: 'PERSONAL_1APP_2ACC',
    price_per_month: 20,
    license_key_count: 1,
    account_limit: 2,
    bonus: null,
    agent_discount_percent: 0,
    community_support: true,
    support_24_7: false,
    type: 'personal' as ServicePackageType,
    is_popular: false,
    sort_order: 10,
  },
  {
    product_code: 'PERSONAL_1APP_5ACC',
    price_per_month: 40,
    license_key_count: 1,
    account_limit: 5,
    bonus: null,
    agent_discount_percent: 0,
    community_support: true,
    support_24_7: false,
    type: 'personal' as ServicePackageType,
    is_popular: false,
    sort_order: 20,
  },
  {
    product_code: 'ENTERPRISE_10APP_50ACC',
    price_per_month: 400,
    license_key_count: 10,
    account_limit: 50,
    bonus: '+300',
    agent_discount_percent: 10,
    community_support: true,
    support_24_7: true,
    type: 'enterprise' as ServicePackageType,
    is_popular: true,
    sort_order: 30,
  },
  {
    product_code: 'ENTERPRISE_100APP_500ACC',
    price_per_month: 4_000,
    license_key_count: 100,
    account_limit: 500,
    bonus: '+2,000',
    agent_discount_percent: 20,
    community_support: true,
    support_24_7: true,
    type: 'enterprise' as ServicePackageType,
    is_popular: false,
    sort_order: 40,
  },
  {
    product_code: 'ENTERPRISE_1000APP_5000ACC',
    price_per_month: 40_000,
    license_key_count: 1_000,
    account_limit: 5_000,
    bonus: '+15,000',
    agent_discount_percent: 30,
    community_support: true,
    support_24_7: true,
    type: 'enterprise' as ServicePackageType,
    is_popular: false,
    sort_order: 50,
  },
  {
    product_code: 'ENTERPRISE_10000APP_50000ACC',
    price_per_month: 400_000,
    license_key_count: 10_000,
    account_limit: 50_000,
    bonus: '+125,000',
    agent_discount_percent: 40,
    community_support: true,
    support_24_7: true,
    type: 'enterprise' as ServicePackageType,
    is_popular: false,
    sort_order: 60,
  },
  {
    product_code: 'ENTERPRISE_100000APP_500000ACC',
    price_per_month: 4_000_000,
    license_key_count: 100_000,
    account_limit: 500_000,
    bonus: '+1,200,000',
    agent_discount_percent: 50,
    community_support: true,
    support_24_7: true,
    type: 'enterprise' as ServicePackageType,
    is_popular: false,
    sort_order: 70,
  },
];

async function ensureDefaultServicePackages(prisma: any) {
  const count = await prisma.servicePackages.count();
  if (count > 0) return;

  await prisma.servicePackages.createMany({
    data: DEFAULT_SERVICE_PACKAGES.map((item) => ({
      product_code: item.product_code,
      price_per_month: item.price_per_month,
      license_key_count: item.license_key_count,
      facebook_personal_limit: item.account_limit,
      facebook_fanpage_limit: item.account_limit,
      zalo_limit: item.account_limit,
      tiktok_limit: item.account_limit,
      telegram_limit: item.account_limit,
      bonus: item.bonus,
      agent_discount_percent: item.agent_discount_percent,
      community_support: item.community_support,
      support_24_7: item.support_24_7,
      type: item.type,
      is_popular: item.is_popular,
      sort_order: item.sort_order,
      is_active: true,
    })),
    skipDuplicates: true,
  });
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListServicePackagesQuery }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const { type } = request.query;

  await ensureDefaultServicePackages(prisma);

  const packages = await prisma.servicePackages.findMany({
    where: {
      is_active: true,
      ...(type ? { type } : {}),
    },
    orderBy: [{ sort_order: 'asc' }, { price_per_month: 'asc' }],
  });

  return reply.send({
    success: true,
    data: packages.map((item: any) => ({
      bonus_percent: item.agent_discount_percent,
      bonus_license_key_count: calcBonusLicenseCount(
        item.license_key_count,
        item.agent_discount_percent,
        item.type,
      ),
      total_license_key_count:
        item.license_key_count +
        calcBonusLicenseCount(item.license_key_count, item.agent_discount_percent, item.type),
      service_package_id: item.service_package_id,
      product_code: item.product_code,
      price_per_month: item.price_per_month.toString(),
      license_key_count: item.license_key_count,
      facebook_personal_limit: item.facebook_personal_limit,
      facebook_fanpage_limit: item.facebook_fanpage_limit,
      zalo_limit: item.zalo_limit,
      tiktok_limit: item.tiktok_limit,
      telegram_limit: item.telegram_limit,
      bonus: item.bonus,
      agent_discount_percent: item.agent_discount_percent,
      community_support: item.community_support,
      support_24_7: item.support_24_7,
      type: item.type,
      is_popular: item.is_popular,
      sort_order: item.sort_order,
    })),
  });
}
