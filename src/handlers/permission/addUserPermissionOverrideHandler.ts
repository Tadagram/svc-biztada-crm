import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { addUserPermissionOverride } from './permissionHelper';

interface AddUserPermissionOverrideParams {
  userId: string;
}

interface AddUserPermissionOverrideBody {
  permission_code: string;
  permission_type: 'allow' | 'deny';
}

async function getUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
  });
}

export async function handler(
  request: FastifyRequest<{
    Params: AddUserPermissionOverrideParams;
    Body: AddUserPermissionOverrideBody;
  }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;
  const { permission_code, permission_type } = request.body;

  try {
    const user = await getUser(request.server.prisma, userId);

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
        user_id: userPermission.user_id,
        permission_code,
        permission_type: userPermission.permission_type,
        allow_codes: userPermission.allow,
        deny_codes: userPermission.deny,
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
