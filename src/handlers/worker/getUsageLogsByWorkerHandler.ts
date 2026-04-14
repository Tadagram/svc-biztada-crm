import { FastifyRequest, FastifyReply } from 'fastify';

interface GetUsageLogsByWorkerQuerystring {
  from?: string;
  to?: string;
  agencyId?: string;
  workerName?: string;
  limit?: number;
  offset?: number;
}

export async function getUsageLogsByWorkerHandler(
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

  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    let workerIdFilter: { in: string[] } | undefined;
    if (workerName) {
      const matchingWorkers = await prisma.workers.findMany({
        where: { name: { contains: workerName, mode: 'insensitive' } },
        select: { worker_id: true },
      });
      const ids = matchingWorkers.map((w) => w.worker_id);
      if (ids.length === 0) {
        return reply.send({
          success: true,
          data: [],
          pagination: { total: 0, limit, offset, totalPages: 0, currentPage: 1 },
        });
      }
      workerIdFilter = { in: ids };
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

    const allGroups = await prisma.workerUsageLogs.groupBy({
      by: ['worker_id'],
      where: logWhere,
    });
    const total = allGroups.length;

    if (total === 0) {
      return reply.send({
        success: true,
        data: [],
        pagination: { total: 0, limit, offset, totalPages: 0, currentPage: 1 },
      });
    }

    const grouped = await prisma.workerUsageLogs.groupBy({
      by: ['worker_id'],
      where: logWhere,
      _count: { usage_log_id: true },
      _max: { start_at: true },
      orderBy: { _max: { start_at: 'desc' } },
      skip: offset,
      take: limit,
    });

    const pageWorkerIds = grouped.map((g) => g.worker_id);

    const [workers, activeSessions] = await Promise.all([
      prisma.workers.findMany({
        where: { worker_id: { in: pageWorkerIds } },
        select: { worker_id: true, name: true, status: true },
      }),
      prisma.workerUsageLogs.groupBy({
        by: ['worker_id'],
        where: { ...logWhere, worker_id: { in: pageWorkerIds }, end_at: null },
        _count: { usage_log_id: true },
      }),
    ]);

    const workerMap = new Map(workers.map((w) => [w.worker_id, w]));
    const activeMap = new Map(activeSessions.map((a) => [a.worker_id, a._count.usage_log_id]));

    const data = grouped.map((g) => ({
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

    return reply.send({
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve usage logs by worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
