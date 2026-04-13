import { FastifyRequest, FastifyReply } from 'fastify';

interface DeletePermissionParams {
  permissionId: string;
}

export async function deletePermissionHandler(
  request: FastifyRequest<{ Params: DeletePermissionParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { permissionId } = request.params;

  try {
    const existing = await prisma.permissions.findFirst({
      where: { permission_id: permissionId, deleted_at: null },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        message: 'Permission not found',
      });
    }

    const deleted = await prisma.permissions.update({
      where: { permission_id: permissionId },
      data: { deleted_at: new Date() },
      select: {
        permission_id: true,
        name: true,
        code: true,
        deleted_at: true,
      },
    });

    return reply.send({
      success: true,
      data: deleted,
      message: 'Permission deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to delete permission',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
