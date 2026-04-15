import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { setUserPermissionOverrides } from './permissionHelper';

interface SetUserPermissionOverridesParams {
  userId: string;
}

interface SetUserPermissionOverridesBody {
  allow_codes?: string[];
  deny_codes?: string[];
}

async function getUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: { user_id: true },
  });
}

export async function handler(
  request: FastifyRequest<{
    Params: SetUserPermissionOverridesParams;
    Body: SetUserPermissionOverridesBody;
  }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;
  const { allow_codes = [], deny_codes = [] } = request.body;

  try {
    const user = await getUser(request.server.prisma, userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    const overrides = await setUserPermissionOverrides(request.server.prisma, userId, {
      allow: allow_codes,
      deny: deny_codes,
    });

    return reply
      .status(200)
      .type('application/json')
      .send({
        success: true,
        message: 'User permission overrides updated successfully',
        data: {
          user_id: userId,
          allow_codes: overrides.allow,
          deny_codes: overrides.deny,
        },
      });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: 'Failed to update permission overrides',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
