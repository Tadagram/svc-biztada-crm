import { FastifyRequest, FastifyReply } from 'fastify';
import { hasAnyPermission } from './permissionHelper';

export async function checkAnyPermissionHandler(
  request: FastifyRequest<{
    Body: {
      user_id: string;
      permission_codes: string[];
    };
  }>,
  reply: FastifyReply,
) {
  const { user_id, permission_codes } = request.body;

  try {
    const user = await request.server.prisma.users.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        role: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    const hasAnyPermission_ = await hasAnyPermission(
      request.server.prisma,
      user_id,
      user.role,
      permission_codes,
    );

    return reply.status(200).send({
      success: true,
      message: hasAnyPermission_ ? 'User has at least one permission' : 'User has no permissions',
      data: {
        user_id,
        permission_codes,
        has_any_permission: hasAnyPermission_,
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
