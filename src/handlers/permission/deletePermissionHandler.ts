import { FastifyRequest, FastifyReply } from 'fastify';

// ── Role default permissions (matches seed) ──────────────────
const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  agency: [
    'users:read',
    'users:create',
    'users:update',
    'workers:read',
    'agency_workers:read',
    'agency_workers:assign_user',
    'agency_workers:release',
    'permissions:read',
    'topup:submit',
  ],
  user: ['users:read', 'workers:read', 'agency_workers:read', 'topup:submit'],
};

interface DeletePermissionParams {
  permissionId: string;
}

export async function deletePermissionHandler(
  request: FastifyRequest<{ Params: DeletePermissionParams }>,
  reply: FastifyReply,
) {
  const { prisma, user } = request;
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

    // ── Protect default permissions for agency/user roles ──────────────────
    // Only mod can delete default permissions
    if (user.role !== 'mod') {
      const userRoleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role] ?? [];
      if (userRoleDefaults.includes(existing.code)) {
        return reply.status(403).send({
          success: false,
          message: `Không thể xóa quyền mặc định "${existing.code}". Quyền này được gán sẵn cho role ${user.role} và chỉ admin mới có thể xóa.`,
        });
      }
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
