import { FastifyReply, FastifyRequest } from 'fastify';

interface CreateServicePackageBody {
  product_code: string;
  price_per_month: number;
  license_key_count: number;
  facebook_personal_limit: number;
  facebook_fanpage_limit: number;
  zalo_limit: number;
  tiktok_limit: number;
  telegram_limit: number;
  bonus?: string | null;
  agent_discount_percent: number;
  community_support: boolean;
  support_24_7: boolean;
  type: 'personal' | 'enterprise';
  is_popular: boolean;
  sort_order: number;
  is_active?: boolean;
}

export async function handler(
  request: FastifyRequest<{ Body: CreateServicePackageBody }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const body = request.body;

  try {
    const created = await prisma.servicePackages.create({
      data: {
        product_code: body.product_code.trim(),
        price_per_month: body.price_per_month,
        license_key_count: body.license_key_count,
        facebook_personal_limit: body.facebook_personal_limit,
        facebook_fanpage_limit: body.facebook_fanpage_limit,
        zalo_limit: body.zalo_limit,
        tiktok_limit: body.tiktok_limit,
        telegram_limit: body.telegram_limit,
        bonus: body.bonus?.trim() || null,
        agent_discount_percent: body.agent_discount_percent,
        community_support: body.community_support,
        support_24_7: body.support_24_7,
        type: body.type,
        is_popular: body.is_popular,
        sort_order: body.sort_order,
        is_active: body.is_active ?? true,
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        ...created,
        price_per_month: created.price_per_month.toString(),
      },
      message: 'Service package created successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: 'Failed to create service package',
    });
  }
}
