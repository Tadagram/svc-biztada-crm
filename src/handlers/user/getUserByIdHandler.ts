import { FastifyRequest, FastifyReply } from 'fastify';

export const getUserByIdHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };

    const user = await request.server.prisma.users.findUnique({
      where: {
        user_id: userId,
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
