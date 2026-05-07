import { FastifyRequest, FastifyReply } from 'fastify';
import { getUserEffectivePermissions, getUserPermissionOverrides } from './permissionHelper';
import { UserRole } from '@prisma/client';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const caller = request.user as { userId: string; role: string | null };

    // null role = full admin (no role restriction)
    if (caller.role === null || caller.role === UserRole.mod) {
      const allPermissions = await request.server.prisma.permissions.findMany({
        select: { code: true },
      });
      const allCodes = allPermissions.map((p) => p.code);
      const grantedCodes =
        caller.role === UserRole.mod
          ? allCodes.filter((code) => code !== 'topup:review')
          : allCodes;

      return reply.status(200).send({
        success: true,
        data: {
          permissions: grantedCodes,
          roleDefaults: grantedCodes,
          overrides: [],
          isMod: caller.role === UserRole.mod,
          isAdmin: caller.role === null,
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

    const overrides = await getUserPermissionOverrides(request.server.prisma, caller.userId);

    return reply.status(200).send({
      success: true,
      data: {
        permissions: effectivePermissions.map((p) => p.code),
        roleDefaults: roleDefaultCodes,
        overrides,
        isMod: false,
        isAdmin: false,
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
