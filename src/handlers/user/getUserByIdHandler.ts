import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

export const getUserByIdHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const caller = request.user as { userId: string; parentUserId?: string | null; role: UserRole };

    const user = await request.server.prisma.users.findFirst({
      where: {
        user_id: userId,
        ...(caller.role === USER_ROLES.AGENCY && { parent_user_id: caller.userId }),
        ...(caller.role === USER_ROLES.USER && { parent_user_id: caller.parentUserId ?? '' }),
      },
      select: {
        user_id: true,
        phone_number: true,
        agency_name: true,
        role: true,
        status: true,
        parent_user_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      reply.status(404).send({
        success: false,
        message: 'User not found',
      });
      return;
    }

    reply.send({
      success: true,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      message: 'Failed to retrieve user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
