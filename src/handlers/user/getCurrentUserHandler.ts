import { FastifyRequest, FastifyReply } from 'fastify';

export const getCurrentUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const caller = request.user as { userId: string; role: string };

    const user = await request.server.prisma.users.findUnique({
      where: { user_id: caller.userId },
      select: {
        user_id: true,
        phone_number: true,
        agency_name: true,
        role: true,
        status: true,
        parent_user_id: true,
        last_active_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    reply.send({
      success: true,
      data: user,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      message: 'Failed to fetch profile',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
