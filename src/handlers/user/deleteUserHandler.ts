import { FastifyRequest, FastifyReply } from 'fastify';

export const deleteUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };

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
