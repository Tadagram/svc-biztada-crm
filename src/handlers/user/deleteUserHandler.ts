import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { CAN_DELETE_USER, USER_ROLES } from '@/utils/constants';

export const deleteUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const caller = request.user as { userId: string; role: UserRole };

    if (!CAN_DELETE_USER.includes(caller.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only mod and agency can delete users',
      });
    }

    const existingUser = await request.server.prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!existingUser) {
      reply.status(404).send({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (caller.role === USER_ROLES.AGENCY && existingUser.parent_user_id !== caller.userId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You can only delete users in your agency',
      });
    }

    const deletedUser = await request.server.prisma.users.update({
      where: { user_id: userId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
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
        deleted_at: true,
      },
    });

    reply.send({
      success: true,
      data: deletedUser,
      message: 'User deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
