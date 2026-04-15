import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getUserEffectivePermissions, getUserPermissionOverrides } from './permissionHelper';

interface GetUserPermissionsParams {
  userId: string;
}

async function getUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      role: true,
      phone_number: true,
    },
  });
}

export async function handler(
  request: FastifyRequest<{
    Params: GetUserPermissionsParams;
  }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;

  try {
    const user = await getUser(request.server.prisma, userId);

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
      message: 'Failed to retrieve user permissions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
