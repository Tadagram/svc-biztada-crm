import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { hasPermission } from './permissionHelper';

async function getUser(prisma: PrismaClient, user_id: string) {
  return prisma.users.findUnique({
    where: { user_id },
    select: {
      user_id: true,
      role: true,
    },
  });
}

export async function handler(
  request: FastifyRequest<{
    Body: {
      user_id: string;
      permission_code: string;
    };
  }>,
  reply: FastifyReply,
) {
  const { user_id, permission_code } = request.body;

  try {
    const user = await getUser(request.server.prisma, user_id);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    const hasAccess = await hasPermission(
      request.server.prisma,
      user_id,
      user.role,
      permission_code,
    );

    return reply.status(200).send({
      success: true,
      message: hasAccess ? 'User has permission' : 'User does not have permission',
      data: {
        user_id,
        permission_code,
        has_permission: hasAccess,
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
