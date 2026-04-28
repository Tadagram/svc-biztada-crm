import { FastifyReply, FastifyRequest } from 'fastify';

interface UpdateServicePackageParams {
  servicePackageId: string;
}

interface UpdateServicePackageBody {
  product_code?: string;
  price_per_month?: number;
  license_key_count?: number;
  facebook_personal_limit?: number;
  facebook_fanpage_limit?: number;
  zalo_limit?: number;
  tiktok_limit?: number;
  telegram_limit?: number;
  bonus?: string | null;
  agent_discount_percent?: number;
  community_support?: boolean;
  support_24_7?: boolean;
  type?: 'personal' | 'enterprise';
  is_popular?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export async function handler(
  request: FastifyRequest<{
    Params: UpdateServicePackageParams;
    Body: UpdateServicePackageBody;
  }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const { servicePackageId } = request.params;
  const body = request.body;

  const existing = await prisma.servicePackages.findUnique({
    where: { service_package_id: servicePackageId },
    select: { service_package_id: true },
  });

  if (!existing) {
    return reply.status(404).send({
      success: false,
      message: 'Service package not found',
    });
  }

  try {
    const updated = await prisma.servicePackages.update({
      where: { service_package_id: servicePackageId },
      data: {
        ...(body.product_code !== undefined ? { product_code: body.product_code.trim() } : {}),
        ...(body.price_per_month !== undefined ? { price_per_month: body.price_per_month } : {}),
        ...(body.license_key_count !== undefined
          ? { license_key_count: body.license_key_count }
          : {}),
        ...(body.facebook_personal_limit !== undefined
          ? { facebook_personal_limit: body.facebook_personal_limit }
          : {}),
        ...(body.facebook_fanpage_limit !== undefined
          ? { facebook_fanpage_limit: body.facebook_fanpage_limit }
          : {}),
        ...(body.zalo_limit !== undefined ? { zalo_limit: body.zalo_limit } : {}),
        ...(body.tiktok_limit !== undefined ? { tiktok_limit: body.tiktok_limit } : {}),
        ...(body.telegram_limit !== undefined ? { telegram_limit: body.telegram_limit } : {}),
        ...(body.bonus !== undefined ? { bonus: body.bonus?.trim() || null } : {}),
        ...(body.agent_discount_percent !== undefined
          ? { agent_discount_percent: body.agent_discount_percent }
          : {}),
        ...(body.community_support !== undefined
          ? { community_support: body.community_support }
          : {}),
        ...(body.support_24_7 !== undefined ? { support_24_7: body.support_24_7 } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.is_popular !== undefined ? { is_popular: body.is_popular } : {}),
        ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
        ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
      },
    });

    return reply.send({
      success: true,
      data: {
        ...updated,
        price_per_month: updated.price_per_month.toString(),
      },
      message: 'Service package updated successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: 'Failed to update service package',
    });
  }
}
