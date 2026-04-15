import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { ROLE_DEFAULT_PERMISSIONS } from '@/utils/constants';

interface DeletePermissionParams {
  permissionId: string;
}

async function getPermission(prisma: PrismaClient, permissionId: string) {
  return prisma.permissions.findFirst({
    where: { permission_id: permissionId, deleted_at: null },
  });
}

function isDefaultPermission(userRole: UserRole, permissionCode: string): boolean {
  if (userRole === UserRole.mod) return false;
  const userRoleDefaults = ROLE_DEFAULT_PERMISSIONS[userRole as UserRole] ?? [];
  return userRoleDefaults.includes(permissionCode);
}

async function deletePermission(prisma: PrismaClient, permissionId: string) {
  return prisma.permissions.update({
    where: { permission_id: permissionId },
    data: { deleted_at: new Date() },
    select: {
      permission_id: true,
      name: true,
      code: true,
      deleted_at: true,
    },
  });
}

export async function handler(
  request: FastifyRequest<{ Params: DeletePermissionParams }>,
  reply: FastifyReply,
) {
  const { prisma, user } = request;
  const { permissionId } = request.params;

  try {
    const existing = await getPermission(prisma, permissionId);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        message: 'Permission not found',
      });
    }

    if (isDefaultPermission(user.role as UserRole, existing.code)) {
      return reply.status(403).send({
        success: false,
        message: `Không thể xóa quyền mặc định "${existing.code}". Quyền này được gán sẵn cho role ${user.role} và chỉ admin mới có thể xóa.`,
      });
    }

    const deleted = await deletePermission(prisma, permissionId);

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
