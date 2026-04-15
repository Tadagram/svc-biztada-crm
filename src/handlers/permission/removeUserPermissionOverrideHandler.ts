import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { removeUserPermissionOverride } from './permissionHelper';

interface RemoveUserPermissionOverrideParams {
  userId: string;
}

interface RemoveUserPermissionOverrideBody {
  permission_code: string;
}

async function getUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
  });
}

export async function handler(
  request: FastifyRequest<{
    Params: RemoveUserPermissionOverrideParams;
    Body: RemoveUserPermissionOverrideBody;
  }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;
  const { permission_code } = request.body;

  try {
    const user = await getUser(request.server.prisma, userId);

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
