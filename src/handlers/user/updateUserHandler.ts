import { FastifyRequest, FastifyReply } from 'fastify';

export const updateUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const { agency_name, role, status, parent_user_id } = request.body as {
      agency_name?: string;
      role?: 'mod' | 'agency' | 'user' | 'customer';
      status?: 'active' | 'disabled';
      parent_user_id?: string;
    };

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

    const updatedUser = await request.server.prisma.users.update({
      where: { user_id: userId },
      data: {
        ...(agency_name !== undefined && { agency_name }),
        ...(role && { role }),
        ...(status && { status }),
        ...(parent_user_id !== undefined && { parent_user_id }),
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
      message: 'User updated successfully',
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
