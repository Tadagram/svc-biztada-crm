import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, UserStatus, PrismaClient } from '@prisma/client';
import { CAN_UPDATE_USER, USER_ROLES } from '@/utils/constants';

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

function validateUpdatePermission(callerRole: UserRole): { valid: boolean; error?: string } {
  if (!CAN_UPDATE_USER.includes(callerRole)) {
    return { valid: false, error: 'Only mod and agency can update users' };
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
    return { valid: false, error: 'You can only update users in your agency' };
  }
  return { valid: true };
}

async function validatePhoneNumber(
  prisma: PrismaClient,
  newPhone: string,
  existingPhone: string,
): Promise<{ valid: boolean; error?: string }> {
  if (newPhone === existingPhone) {
    return { valid: true };
  }

  const existingUser = await prisma.users.findUnique({
    where: { phone_number: newPhone },
  });

  if (existingUser) {
    return { valid: false, error: 'Phone number already in use' };
  }

  return { valid: true };
}

async function updateUser(
  prisma: PrismaClient,
  userId: string,
  updates: {
    phone_number?: string;
    agency_name?: string;
    role?: UserRole;
    status?: UserStatus;
    parent_user_id?: string;
    restore?: boolean;
  },
) {
  return prisma.users.update({
    where: { user_id: userId },
    data: {
      ...(updates.phone_number !== undefined && { phone_number: updates.phone_number }),
      ...(updates.agency_name !== undefined && { agency_name: updates.agency_name }),
      ...(updates.role && { role: updates.role }),
      ...(updates.status && { status: updates.status }),
      ...(updates.parent_user_id !== undefined && { parent_user_id: updates.parent_user_id }),
      ...(updates.restore === true && { deleted_at: null, status: UserStatus.active }),
      updated_at: new Date(),
    },
    select: userSelect,
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
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
    const caller = request.user as { userId: string; role: UserRole };

    const permissionValidation = validateUpdatePermission(caller.role);
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

    if (phone_number !== undefined) {
      const phoneValidation = await validatePhoneNumber(
        request.server.prisma,
        phone_number,
        existingUser.phone_number,
      );
      if (!phoneValidation.valid) {
        return reply.status(400).send({
          success: false,
          message: phoneValidation.error,
        });
      }
    }

    const updatedUser = await updateUser(request.server.prisma, userId, {
      phone_number,
      agency_name,
      role,
      status,
      parent_user_id,
      restore,
    });

    return reply.send({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
