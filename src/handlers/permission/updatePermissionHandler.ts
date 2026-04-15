import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { ROLE_DEFAULT_PERMISSIONS } from '@/utils/constants';

interface UpdatePermissionParams {
  permissionId: string;
}

interface UpdatePermissionBody {
  name?: string;
  code?: string;
}

export async function handler(
  request: FastifyRequest<{
    Params: UpdatePermissionParams;
    Body: UpdatePermissionBody;
  }>,
  reply: FastifyReply,
) {
  const { prisma, user } = request;
  const { permissionId } = request.params;
  const { name, code } = request.body;

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
    // Only mod can edit default permissions
    if (user.role !== UserRole.mod) {
      const userRoleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role as UserRole] ?? [];
      if (userRoleDefaults.includes(existing.code)) {
        return reply.status(403).send({
          success: false,
          message: `Không thể cập nhật quyền mặc định "${existing.code}". Quyền này được gán sẵn cho role ${user.role} và chỉ admin mới có thể chỉnh sửa.`,
        });
      }
    }

    // Check code conflict with another permission
    if (code && code !== existing.code) {
      const codeConflict = await prisma.permissions.findUnique({ where: { code } });
      if (codeConflict) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `Permission with code "${code}" already exists`,
        });
      }
    }

    const updated = await prisma.permissions.update({
      where: { permission_id: permissionId },
      data: {
        ...(name && { name }),
        ...(code && { code }),
      },
      select: {
        permission_id: true,
        name: true,
        code: true,
        created_at: true,
        updated_at: true,
      },
    });

    return reply.send({
      success: true,
      data: updated,
      message: 'Permission updated successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to update permission',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
