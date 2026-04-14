import { FastifyRequest, FastifyReply } from 'fastify';

export const updateProfileHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const caller = request.user as { userId: string; role: string };
    const { agency_name } = request.body as { agency_name?: string };

    if (!agency_name || !agency_name.trim()) {
      return reply.status(400).send({
        success: false,
        message: 'agency_name is required',
      });
    }

    const updatedUser = await request.server.prisma.users.update({
      where: { user_id: caller.userId },
      data: {
        agency_name: agency_name.trim(),
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
      },
    });

    reply.send({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
