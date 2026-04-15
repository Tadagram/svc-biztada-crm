import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { CAN_DELETE_USER, USER_ROLES } from '@/utils/constants';

const userSelect = {
  user_id: true,
  phone_number: true,
  agency_name: true,
  role: true,
  status: true,
  parent_user_id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
};

function validateDeletePermission(callerRole: UserRole): { valid: boolean; error?: string } {
  if (!CAN_DELETE_USER.includes(callerRole)) {
    return { valid: false, error: 'Only mod and agency can delete users' };
  }
  return { valid: true };
}

async function getUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
  });
}

function validateAgencyAccess(
  callerRole: UserRole,
  callerId: string,
  userParentId?: string | null,
): { valid: boolean; error?: string } {
  if (callerRole === USER_ROLES.AGENCY && userParentId !== callerId) {
    return { valid: false, error: 'You can only delete users in your agency' };
  }
  return { valid: true };
}

async function softDeleteUser(prisma: PrismaClient, userId: string) {
  return prisma.users.update({
    where: { user_id: userId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
    select: userSelect,
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId } = request.params as { userId: string };
    const caller = request.user as { userId: string; role: UserRole };

    const permissionValidation = validateDeletePermission(caller.role);
    if (!permissionValidation.valid) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: permissionValidation.error,
      });
    }

    const existingUser = await getUser(request.server.prisma, userId);
    if (!existingUser) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    const accessValidation = validateAgencyAccess(
      caller.role,
      caller.userId,
      existingUser.parent_user_id,
    );
    if (!accessValidation.valid) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: accessValidation.error,
      });
    }

    const deletedUser = await softDeleteUser(request.server.prisma, userId);

    return reply.send({
      success: true,
      data: deletedUser,
      message: 'User deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
