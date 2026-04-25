import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { CAN_DELETE_USER, USER_ROLES } from '@/utils/constants';
import { purgeUserAcrossServices } from '@services/crossServiceUserPurge';

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

function validateDeletePermission(callerRole: UserRole | null): { valid: boolean; error?: string } {
  if (callerRole === null) return { valid: true }; // admin → full access
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

async function hardDeleteUser(prisma: PrismaClient, userId: string) {
  await prisma.$transaction(async (tx) => {
    const txAny = tx as any;

    await tx.userSessions.deleteMany({ where: { user_id: userId } });

    await tx.workerUsageLogs.deleteMany({
      where: {
        OR: [{ user_id: userId }, { agency_user_id: userId }],
      },
    });

    await tx.agencyWorkers.deleteMany({
      where: {
        OR: [{ agency_user_id: userId }, { using_by: userId }],
      },
    });

    await tx.notifications.deleteMany({
      where: {
        OR: [{ recipient_id: userId }, { sender_id: userId }],
      },
    });

    await tx.creditLedgerEntries.deleteMany({ where: { user_id: userId } });
    await tx.userCreditBalances.deleteMany({ where: { user_id: userId } });

    await tx.topUpRequests.deleteMany({ where: { user_id: userId } });
    await tx.topUpRequests.updateMany({
      where: { reviewed_by: userId },
      data: { reviewed_by: null },
    });

    await txAny.servicePackagePurchases.deleteMany({ where: { user_id: userId } });
    await txAny.servicePackagePurchases.updateMany({
      where: { seller_user_id: userId },
      data: { seller_user_id: null },
    });

    await tx.users.updateMany({
      where: { parent_user_id: userId },
      data: { parent_user_id: null },
    });

    await tx.users.deleteMany({ where: { user_id: userId } });
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId } = request.params as { userId: string };
    const { hard } = request.query as { hard?: string | boolean };
    const hardDelete = hard === true || hard === 'true' || hard === '1';
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

    if (hardDelete && caller.role !== null && caller.role !== USER_ROLES.MOD) {
      return reply.status(403).send({
        success: false,
        message: 'Hard delete requires mod/admin privileges',
      });
    }

    if (hardDelete) {
      const purgeReport = await purgeUserAcrossServices(userId);
      if (!purgeReport.allSucceeded) {
        return reply.status(502).send({
          success: false,
          message: 'Không thể xóa sạch user trên tất cả services',
          purge_report: purgeReport,
        });
      }

      await hardDeleteUser(request.server.prisma, userId);

      return reply.send({
        success: true,
        message: 'User đã được xóa cứng khỏi CRM và các service liên quan',
        purge_report: purgeReport,
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
