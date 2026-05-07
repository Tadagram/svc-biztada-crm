import { FastifyRequest, FastifyReply } from 'fastify';
import { getUserEffectivePermissions, getUserPermissionOverrides } from './permissionHelper';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const caller = request.user as { userId: string; role: string | null };

    // null role = full admin (no role restriction)
    if (caller.role === null) {
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
          isAdmin: true,
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
