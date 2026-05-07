import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { CAN_DELETE_USER, USER_ROLES } from '@/utils/constants';
import { purgeUserAcrossServices } from '@services/crossServiceUserPurge';

type LocalDeleteAudit = {
  user_sessions: number;
  worker_usage_logs_by_user: number;
  worker_usage_logs_by_agency_user: number;
  agency_workers_by_agency_user: number;
  agency_workers_by_using_user: number;
  notifications_as_recipient: number;
  notifications_as_sender: number;
  credit_ledger_entries: number;
  credit_balances: number;
  topup_requests_created: number;
  topup_requests_reviewed: number;
  service_package_purchases_as_buyer: number;
  service_package_purchases_as_seller: number;
  child_users_parent_linked: number;
};

type CoreSharedBusiness = {
  business_id: string;
  other_members_count: number;
};

type CorePurgeAuditData = {
  user_id: string;
  business_ids: string[];
  telegram_id?: number;
  shared_businesses: CoreSharedBusiness[];
  dry_run?: boolean;
};

type DeleteAuditReport = {
  user_id: string;
  hard_delete_requested: boolean;
  local_crm: LocalDeleteAudit;
  core: {
    attempted: boolean;
    success: boolean;
    status?: number;
    message?: string;
    data?: CorePurgeAuditData;
  };
  guard: {
    blocked_by_shared_business: boolean;
    shared_businesses: CoreSharedBusiness[];
  };
};

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
    return { valid: false, error: 'Only admin and mod can delete users' };
  }
  return { valid: true };
}

async function getUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
  });
}

function validateAgencyAccess(
  callerRole: UserRole | null,
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

async function buildLocalDeleteAudit(
  prisma: PrismaClient,
  userId: string,
): Promise<LocalDeleteAudit> {
  const txAny = prisma as any;

  const [
    userSessions,
    workerUsageByUser,
    workerUsageByAgency,
    agencyWorkersByAgency,
    agencyWorkersByUsing,
    notificationsRecipient,
    notificationsSender,
    creditEntries,
    creditBalances,
    topupsCreated,
    topupsReviewed,
    purchasesBuyer,
    purchasesSeller,
    childUsers,
  ] = await Promise.all([
    prisma.userSessions.count({ where: { user_id: userId } }),
    prisma.workerUsageLogs.count({ where: { user_id: userId } }),
    prisma.workerUsageLogs.count({ where: { agency_user_id: userId } }),
    prisma.agencyWorkers.count({ where: { agency_user_id: userId } }),
    prisma.agencyWorkers.count({ where: { using_by: userId } }),
    prisma.notifications.count({ where: { recipient_id: userId } }),
    prisma.notifications.count({ where: { sender_id: userId } }),
    prisma.creditLedgerEntries.count({ where: { user_id: userId } }),
    prisma.userCreditBalances.count({ where: { user_id: userId } }),
    prisma.topUpRequests.count({ where: { user_id: userId } }),
    prisma.topUpRequests.count({ where: { reviewed_by: userId } }),
    txAny.servicePackagePurchases.count({ where: { user_id: userId } }),
    txAny.servicePackagePurchases.count({ where: { seller_user_id: userId } }),
    prisma.users.count({ where: { parent_user_id: userId } }),
  ]);

  return {
    user_sessions: userSessions,
    worker_usage_logs_by_user: workerUsageByUser,
    worker_usage_logs_by_agency_user: workerUsageByAgency,
    agency_workers_by_agency_user: agencyWorkersByAgency,
    agency_workers_by_using_user: agencyWorkersByUsing,
    notifications_as_recipient: notificationsRecipient,
    notifications_as_sender: notificationsSender,
    credit_ledger_entries: creditEntries,
    credit_balances: creditBalances,
    topup_requests_created: topupsCreated,
    topup_requests_reviewed: topupsReviewed,
    service_package_purchases_as_buyer: purchasesBuyer,
    service_package_purchases_as_seller: purchasesSeller,
    child_users_parent_linked: childUsers,
  };
}

async function fetchCorePurgeAudit(userId: string): Promise<DeleteAuditReport['core']> {
  const baseUrl = (process.env.CORE_API_URL ?? '').trim().replace(/\/$/, '');
  if (!baseUrl) {
    return {
      attempted: false,
      success: false,
      message: 'CORE_API_URL is not configured',
    };
  }

  const internalToken =
    (process.env.INTERNAL_PURGE_TOKEN ?? '').trim() || (process.env.INTERNAL_TOKEN ?? '').trim();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (internalToken) {
      headers['X-Internal-Token'] = internalToken;
    }

    const response = await fetch(
      `${baseUrl}/internal/users/${encodeURIComponent(userId)}/purge?dry_run=true`,
      {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(20_000),
      },
    );

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        attempted: true,
        success: false,
        status: response.status,
        message:
          payload?.message ||
          payload?.error ||
          `svc-core-api dry-run failed with ${response.status}`,
      };
    }

    return {
      attempted: true,
      success: true,
      status: response.status,
      data: payload?.data as CorePurgeAuditData | undefined,
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      message: error instanceof Error ? error.message : 'Failed to call svc-core-api dry-run',
    };
  }
}

async function buildDeleteAuditReport(
  prisma: PrismaClient,
  userId: string,
  hardDelete: boolean,
): Promise<DeleteAuditReport> {
  const [localAudit, coreAudit] = await Promise.all([
    buildLocalDeleteAudit(prisma, userId),
    fetchCorePurgeAudit(userId),
  ]);

  const sharedBusinesses = coreAudit.data?.shared_businesses ?? [];

  return {
    user_id: userId,
    hard_delete_requested: hardDelete,
    local_crm: localAudit,
    core: coreAudit,
    guard: {
      blocked_by_shared_business: sharedBusinesses.length > 0,
      shared_businesses: sharedBusinesses,
    },
  };
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId } = request.params as { userId: string };
    const { hard, dry_run } = request.query as {
      hard?: string | boolean;
      dry_run?: string | boolean;
    };
    const hardDelete = hard === true || hard === 'true' || hard === '1';
    const dryRun = dry_run === true || dry_run === 'true' || dry_run === '1';
    const caller = request.user as { userId: string; role: UserRole | null };

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

    const auditReport = await buildDeleteAuditReport(request.server.prisma, userId, hardDelete);

    if (dryRun) {
      return reply.send({
        success: true,
        dry_run: true,
        message: 'Dry-run audit report generated',
        audit_report: auditReport,
      });
    }

    if (hardDelete) {
      if (auditReport.guard.blocked_by_shared_business) {
        return reply.status(409).send({
          success: false,
          message:
            'Hard delete blocked: user still shares one or more businesses with other active members',
          audit_report: auditReport,
        });
      }

      const purgeReport = await purgeUserAcrossServices(userId);
      if (!purgeReport.allSucceeded) {
        return reply.status(502).send({
          success: false,
          message: 'Không thể xóa sạch user trên tất cả services',
          audit_report: auditReport,
          purge_report: purgeReport,
        });
      }

      await hardDeleteUser(request.server.prisma, userId);

      return reply.send({
        success: true,
        message: 'User đã được xóa cứng khỏi CRM và các service liên quan',
        audit_report: auditReport,
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
