import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

function buildWhereClause(
  userId: string,
  callerRole: UserRole,
  callerId: string,
  callerParentId?: string,
) {
  if (callerRole === USER_ROLES.AGENCY) {
    return { user_id: userId, parent_user_id: callerId };
  }
  if (callerRole === USER_ROLES.USER) {
    return {
      user_id: userId,
      OR: [{ user_id: callerId }, { parent_user_id: callerParentId ?? '' }],
    };
  }
  return { user_id: userId };
}

async function getUser(prisma: PrismaClient, whereClause: any) {
  return prisma.users.findFirst({
    where: whereClause,
    select: { user_id: true, role: true, status: true },
  });
}

async function getAssignedWorkers(prisma: PrismaClient, userId: string) {
  return prisma.agencyWorkers.findMany({
    where: { using_by: userId, deleted_at: null },
    select: {
      agency_worker_id: true,
      status: true,
      worker: { select: { worker_id: true, name: true, status: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

async function getUsageLogs(prisma: PrismaClient, userId: string) {
  return prisma.workerUsageLogs.findMany({
    where: { user_id: userId },
    select: { start_at: true, end_at: true },
    orderBy: { start_at: 'desc' },
  });
}

function calculateUsageStats(usageLogs: any[]) {
  const totalSessions = usageLogs.length;
  const activeSessions = usageLogs.filter((l) => !l.end_at).length;

  const completedLogs = usageLogs.filter((l) => l.end_at !== null);
  const totalMs = completedLogs.reduce((acc, l) => {
    return acc + (new Date(l.end_at!).getTime() - new Date(l.start_at).getTime());
  }, 0);
  const totalHours = Math.round((totalMs / 3_600_000) * 10) / 10;
  const lastUsedAt = usageLogs[0]?.start_at ?? null;

  return { totalSessions, activeSessions, totalHours, lastUsedAt };
}

export async function handler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;
  const prisma = request.server.prisma;
  const caller = request.user as { userId: string; role: UserRole; parentUserId?: string };

  const whereClause = buildWhereClause(userId, caller.role, caller.userId, caller.parentUserId);
  const user = await getUser(prisma, whereClause);

  if (!user) {
    return reply.status(404).send({ success: false, message: 'User not found' });
  }

  const assignedWorkers = await getAssignedWorkers(prisma, userId);
  const usageLogs = await getUsageLogs(prisma, userId);
  const { totalSessions, activeSessions, totalHours, lastUsedAt } = calculateUsageStats(usageLogs);

  return reply.send({
    success: true,
    data: {
      worker_count: assignedWorkers.length,
      active_sessions: activeSessions,
      total_sessions: totalSessions,
      total_hours: totalHours,
      last_used_at: lastUsedAt,
      assigned_workers: assignedWorkers.map((aw) => ({
        worker_id: aw.worker.worker_id,
        name: aw.worker.name,
        status: aw.worker.status,
        assignment_status: aw.status,
      })),
    },
  });
}
