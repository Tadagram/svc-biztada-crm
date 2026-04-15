import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

const userSelect = {
  user_id: true,
  phone_number: true,
  agency_name: true,
  role: true,
  status: true,
  parent_user_id: true,
  created_at: true,
  updated_at: true,
};

function buildWhereClause(
  userId: string,
  callerRole: UserRole,
  callerId: string,
  callerParentId?: string | null,
) {
  return {
    user_id: userId,
    ...(callerRole === USER_ROLES.AGENCY && { parent_user_id: callerId }),
    ...(callerRole === USER_ROLES.USER && { parent_user_id: callerParentId ?? '' }),
  };
}

async function getUser(prisma: PrismaClient, whereClause: any) {
  return prisma.users.findFirst({
    where: whereClause,
    select: userSelect,
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId } = request.params as { userId: string };
    const caller = request.user as { userId: string; parentUserId?: string | null; role: UserRole };

    const whereClause = buildWhereClause(userId, caller.role, caller.userId, caller.parentUserId);
    const user = await getUser(request.server.prisma, whereClause);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
