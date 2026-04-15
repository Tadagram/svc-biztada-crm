import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';
import { CAN_UPDATE_USER, USER_ROLES } from '@/utils/constants';

export const updateUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const { phone_number, agency_name, role, status, parent_user_id, restore } = request.body as {
      phone_number?: string;
      agency_name?: string;
      role?: UserRole;
      status?: UserStatus;
      parent_user_id?: string;
      restore?: boolean;
    };

    // 🔐 Role check: chỉ Mod & Agency được cập nhật user
    const caller = request.user as { userId: string; role: UserRole };
    if (!CAN_UPDATE_USER.includes(caller.role)) {
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
    if (caller.role === USER_ROLES.AGENCY && existingUser.parent_user_id !== caller.userId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You can only update users in your agency',
      });
    }

    if (phone_number !== undefined && phone_number !== existingUser.phone_number) {
      const existingPhone = await request.server.prisma.users.findUnique({
        where: { phone_number },
      });

      if (existingPhone) {
        return reply.status(400).send({
          success: false,
          message: 'Phone number already in use',
        });
      }
    }

    const updatedUser = await request.server.prisma.users.update({
      where: { user_id: userId },
      data: {
        ...(phone_number !== undefined && { phone_number }),
        ...(agency_name !== undefined && { agency_name }),
        ...(role && { role }),
        ...(status && { status }),
        ...(parent_user_id !== undefined && { parent_user_id }),
        ...(restore === true && { deleted_at: null, status: UserStatus.active }),
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
