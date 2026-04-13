import { FastifyRequest, FastifyReply } from 'fastify';
import { PermissionType } from '@prisma/client';
import { addUserPermissionOverride } from './permissionHelper';

export async function addUserPermissionOverrideHandler(
  request: FastifyRequest<{
    Params: {
      userId: string;
    };
    Body: {
      permission_code: string;
      permission_type: PermissionType;
    };
  }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;
  const { permission_code, permission_type } = request.body;

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

    const userPermission = await addUserPermissionOverride(
      request.server.prisma,
      userId,
      permission_code,
      permission_type,
    );

    return reply.status(201).send({
      success: true,
      message: 'User permission override added successfully',
      data: {
        user_permission_id: userPermission.user_permission_id,
        user_id: userPermission.user_id,
        permission_code,
        permission_type: userPermission.permission_type,
        created_at: userPermission.created_at,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: 'Failed to add permission override',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
