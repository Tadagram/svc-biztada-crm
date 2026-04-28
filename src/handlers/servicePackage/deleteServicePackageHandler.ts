import { FastifyReply, FastifyRequest } from 'fastify';

interface DeleteServicePackageParams {
  servicePackageId: string;
}

export async function handler(
  request: FastifyRequest<{ Params: DeleteServicePackageParams }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const { servicePackageId } = request.params;

  const existing = await prisma.servicePackages.findUnique({
    where: { service_package_id: servicePackageId },
    select: { service_package_id: true, product_code: true },
  });

  if (!existing) {
    return reply.status(404).send({
      success: false,
      message: 'Service package not found',
    });
  }

  const purchasesCount = await prisma.servicePackagePurchases.count({
    where: { service_package_id: servicePackageId },
  });

  if (purchasesCount > 0) {
    await prisma.servicePackages.update({
      where: { service_package_id: servicePackageId },
      data: { is_active: false },
    });

    return reply.send({
      success: true,
      message:
        'Service package has purchase history, so it was archived (is_active=false) instead of hard deleted.',
      data: { archived: true },
    });
  }

  await prisma.servicePackages.delete({
    where: { service_package_id: servicePackageId },
  });

  return reply.send({
    success: true,
    message: 'Service package deleted successfully',
    data: { archived: false },
  });
}
