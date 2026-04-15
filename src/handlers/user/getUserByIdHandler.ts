import { FastifyRequest, FastifyReply } from 'fastify';

export const getUserByIdHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const caller = request.user;

    const user = await request.server.prisma.users.findFirst({
      where: {
        user_id: userId,
        ...(caller.role === 'agency' && { parent_user_id: caller.userId }),
        ...(caller.role === 'user' && { parent_user_id: caller.parentUserId ?? '' }),
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
