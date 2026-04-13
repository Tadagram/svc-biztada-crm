import { FastifyRequest, FastifyReply } from 'fastify';
import { removeUserPermissionOverride } from './permissionHelper';

export async function removeUserPermissionOverrideHandler(
  request: FastifyRequest<{
    Params: {
      userId: string;
    };
    Body: {
      permission_code: string;
    };
  }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;
  const { permission_code } = request.body;

  try {
    const user = await request.server.prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    await removeUserPermissionOverride(request.server.prisma, userId, permission_code);

    return reply.status(200).send({
      success: true,
      message: 'User permission override removed successfully',
      data: {
        user_id: userId,
        permission_code,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: 'Failed to remove permission override',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
