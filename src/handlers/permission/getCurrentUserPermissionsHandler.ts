import { FastifyRequest, FastifyReply } from 'fastify';
import { getUserEffectivePermissions } from './permissionHelper';
import { UserRole } from '@prisma/client';

export async function getCurrentUserPermissionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const caller = request.user as { userId: string; role: string };

    if (caller.role === UserRole.mod) {
      const allPermissions = await request.server.prisma.permissions.findMany({
        select: { code: true },
      });
      const allCodes = allPermissions.map((p) => p.code);

      return reply.status(200).send({
        success: true,
        data: {
          permissions: allCodes,
          roleDefaults: allCodes,
          overrides: [],
          isMod: true,
        },
      });
    }

    const effectivePermissions = await getUserEffectivePermissions(
      request.server.prisma,
      caller.userId,
      caller.role,
    );

    const roleDefaults = await request.server.prisma.rolePermissions.findMany({
      where: { role: caller.role },
      select: {
        permission: {
          select: { code: true },
        },
      },
    });

    const roleDefaultCodes = roleDefaults.map((rp) => rp.permission.code);

    const overrides = await request.server.prisma.userPermissions.findMany({
      where: { user_id: caller.userId },
      select: {
        permission: {
          select: { code: true },
        },
      },
    });

    const overrideCodes = overrides.map((up) => up.permission.code);

    return reply.status(200).send({
      success: true,
      data: {
        permissions: effectivePermissions.map((p) => p.code),
        roleDefaults: roleDefaultCodes,
        overrides: overrideCodes,
        isMod: false,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch current user permissions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
