import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface GetUsageLogsByWorkerQuerystring {
  from?: string;
  to?: string;
  agencyId?: string;
  workerName?: string;
  limit?: number;
  offset?: number;
}

async function resolveWorkerIds(prisma: PrismaClient, workerName: string) {
  const matchingWorkers = await prisma.workers.findMany({
    where: { name: { contains: workerName, mode: 'insensitive' } },
    select: { worker_id: true },
  });
  return matchingWorkers.map((w) => w.worker_id);
}

async function fetchGroupedLogs(prisma: PrismaClient, where: any, limit: number, offset: number) {
  const allGroups = await prisma.workerUsageLogs.groupBy({
    by: ['worker_id'],
    where,
    _count: { usage_log_id: true },
    _max: { start_at: true },
    orderBy: { _max: { start_at: 'desc' } },
  });

  const totalGroups = allGroups.length;
  const paginatedGroups = allGroups.slice(offset, offset + limit);
  const pageWorkerIds = paginatedGroups.map((g) => g.worker_id);

  const [workers, activeSessions] = await Promise.all([
    prisma.workers.findMany({
      where: { worker_id: { in: pageWorkerIds } },
      select: { worker_id: true, name: true, status: true },
    }),
    prisma.workerUsageLogs.groupBy({
      by: ['worker_id'],
      where: { ...where, worker_id: { in: pageWorkerIds }, end_at: null },
      _count: { usage_log_id: true },
    }),
  ]);

  const workerMap = new Map(workers.map((w) => [w.worker_id, w]));
  const activeMap = new Map(activeSessions.map((a) => [a.worker_id, a._count.usage_log_id]));

  const groupedData = paginatedGroups.map((g) => ({
    worker_id: g.worker_id,
    worker: workerMap.get(g.worker_id) ?? {
      worker_id: g.worker_id,
      name: '—',
      status: 'unknown',
    },
    total_sessions: g._count.usage_log_id,
    active_sessions: activeMap.get(g.worker_id) ?? 0,
    last_used_at: g._max.start_at,
  }));

  return { groupedData, totalGroups };
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetUsageLogsByWorkerQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const {
    from,
    to,
    agencyId,
    workerName,
    limit: queryLimit = 10,
    offset: queryOffset = 0,
  } = request.query;

  const caller = request.user as { userId: string; role: UserRole };

  if (caller.role !== USER_ROLES.MOD && caller.role !== null) {
    return reply.status(403).send({
      success: false,
      message: 'Only administrators can access detailed usage logs',
    });
  }

  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    let workerIdFilter: { in: string[] } | undefined;
    if (workerName) {
      const allIds = await resolveWorkerIds(prisma, workerName);
      if (allIds.length === 0) {
        return reply.send({
          success: true,
          data: [],
          pagination: { total: 0, limit, offset, pages: 0 },
        });
      }
      workerIdFilter = { in: allIds };
    }

    const logWhere = {
      ...(workerIdFilter && { worker_id: workerIdFilter }),
      ...(agencyId && { agency_user_id: agencyId }),
      ...((from || to) && {
        start_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const { groupedData, totalGroups } = await fetchGroupedLogs(prisma, logWhere, limit, offset);

    return reply.send({
      success: true,
      data: groupedData,
      pagination: {
        total: totalGroups,
        limit,
        offset,
        pages: Math.ceil(totalGroups / limit),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch grouped usage logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
