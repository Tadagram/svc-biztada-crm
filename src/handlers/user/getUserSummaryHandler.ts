import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * GET /users/:userId/summary
 * Returns customer engagement summary: assigned workers, session stats, total hours used.
 */
export const getUserSummaryHandler = async (
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) => {
  const { userId } = request.params;
  const prisma = request.server.prisma;
  const caller = request.user;

  const user = await prisma.users.findFirst({
    where: {
      user_id: userId,
      ...(caller.role === 'agency' && { parent_user_id: caller.userId }),
      ...(caller.role === 'user' && {
        OR: [{ user_id: caller.userId }, { parent_user_id: caller.parentUserId ?? '' }],
      }),
    },
    select: { user_id: true, role: true, status: true },
  });

  if (!user) {
    return reply.status(404).send({ success: false, message: 'User not found' });
  }

  // Workers currently assigned to this user (using_by = userId)
  const assignedWorkers = await prisma.agencyWorkers.findMany({
    where: { using_by: userId, deleted_at: null },
    select: {
      agency_worker_id: true,
      status: true,
      worker: { select: { worker_id: true, name: true, status: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  // Usage log stats (user_id = userId in usage logs)
  const usageLogs = await prisma.workerUsageLogs.findMany({
    where: { user_id: userId },
    select: { start_at: true, end_at: true },
    orderBy: { start_at: 'desc' },
  });

  const totalSessions = usageLogs.length;
  const activeSessions = usageLogs.filter((l) => !l.end_at).length;

  const completedLogs = usageLogs.filter((l) => l.end_at !== null);
  const totalMs = completedLogs.reduce((acc, l) => {
    return acc + (new Date(l.end_at!).getTime() - new Date(l.start_at).getTime());
  }, 0);
  const totalHours = Math.round((totalMs / 3_600_000) * 10) / 10;

  const lastUsedAt = usageLogs[0]?.start_at ?? null;

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
};
