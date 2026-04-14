import { FastifyRequest, FastifyReply } from 'fastify';
import { getUserEffectivePermissions, getUserPermissionOverrides } from './permissionHelper';

export async function getUserPermissionsHandler(
  request: FastifyRequest<{
    Params: {
      userId: string;
    };
  }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;

  try {
    const user = await request.server.prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        role: true,
        phone_number: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    const effectivePermissions = await getUserEffectivePermissions(
      request.server.prisma,
      userId,
      user.role,
    );
    const overrides = await getUserPermissionOverrides(request.server.prisma, userId);

    return reply.status(200).send({
      success: true,
      message: 'User permissions retrieved successfully',
      data: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        role: user.role,
        permissions: effectivePermissions,
        overrides,
        total: effectivePermissions.length,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
