import { FastifyRequest, FastifyReply } from 'fastify';

export const updateUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const { agency_name, role, status, parent_user_id, restore } = request.body as {
      agency_name?: string;
      role?: 'mod' | 'agency' | 'user' | 'customer';
      status?: 'active' | 'disabled';
      parent_user_id?: string;
      restore?: boolean;
    };

    // 🔐 Role check: chỉ Mod & Agency được cập nhật user
    const caller = request.user as { userId: string; role: string };
    if (!['mod', 'agency'].includes(caller.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only mod and agency can update users',
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

    // 🔐 Agency isolation: agency chỉ được sửa users của nó
    if (caller.role === 'agency' && existingUser.parent_user_id !== caller.userId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You can only update users in your agency',
      });
    }

    const updatedUser = await request.server.prisma.users.update({
      where: { user_id: userId },
      data: {
        ...(agency_name !== undefined && { agency_name }),
        ...(role && { role }),
        ...(status && { status }),
        ...(parent_user_id !== undefined && { parent_user_id }),
        ...(restore === true && { deleted_at: null, status: 'active' as const }),
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
