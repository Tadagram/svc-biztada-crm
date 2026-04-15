import { FastifyRequest, FastifyReply } from 'fastify';

interface GetUsageLogsQuerystring {
  workerId?: string;
  workerName?: string;
  agencyId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  /** Filter only open (ongoing) logs: end_at IS NULL */
  open?: boolean;
  /** ISO date string – filter logs where start_at >= from */
  from?: string;
  /** ISO date string – filter logs where start_at <= to */
  to?: string;
  /** Return all records without pagination */
  all?: boolean;
}

function buildUsageLogIsolation(caller: {
  userId: string;
  role: string;
}): Record<string, string> | null {
  if (caller.role === 'mod') return {};
  if (caller.role === 'agency') return { agency_user_id: caller.userId };
  if (caller.role === 'user') return { user_id: caller.userId };
  return null;
}

/**
 * GET /usage-logs
 * Returns worker usage history with pagination.
 * Filterable by workerId/workerName, agencyId, userId, open, from, to.
 */
export async function getUsageLogsHandler(
  request: FastifyRequest<{ Querystring: GetUsageLogsQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const {
    workerId,
    workerName,
    agencyId,
    userId,
    limit: queryLimit = 10,
    offset: queryOffset = 0,
    open,
    from,
    to,
    all,
  } = request.query;

  const limit = Number(queryLimit);
  const offset = Number(queryOffset);
  const isOpen = open === true || String(open) === 'true';
  const isAll = all === true || String(all) === 'true';

  try {
    const caller = request.user;
    const isolation = buildUsageLogIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    // If filtering by worker name, resolve to worker IDs first
    let resolvedWorkerIds: string[] | undefined;
    if (workerName) {
      const matchingWorkers = await prisma.workers.findMany({
        where: { name: { contains: workerName, mode: 'insensitive' } },
        select: { worker_id: true },
      });
      resolvedWorkerIds = matchingWorkers.map((w) => w.worker_id);
      // No matching workers → return empty
      if (resolvedWorkerIds.length === 0) {
        return reply.send({
          success: true,
          data: [],
          pagination: { total: 0, limit, offset, totalPages: 0, currentPage: 1 },
        });
      }
    }

    const where = {
      ...isolation,
      ...(workerId && { worker_id: workerId }),
      ...(resolvedWorkerIds && { worker_id: { in: resolvedWorkerIds } }),
      ...(caller.role === 'mod' && agencyId && { agency_user_id: agencyId }),
      ...(caller.role === 'mod' && userId && { user_id: userId }),
      ...(isOpen && { end_at: null }),
      ...((from || to) && {
        start_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const select = {
      usage_log_id: true,
      worker_id: true,
      agency_user_id: true,
      user_id: true,
      start_at: true,
      end_at: true,
      metadata: true,
      created_at: true,
      worker: { select: { worker_id: true, name: true, status: true } },
      agency: { select: { user_id: true, agency_name: true, phone_number: true } },
      user: { select: { user_id: true, phone_number: true, role: true } },
    };

    const [logs, total] = await Promise.all([
      prisma.workerUsageLogs.findMany({
        where,
        select,
        orderBy: { start_at: 'desc' },
        ...(isAll ? {} : { skip: offset, take: limit }),
      }),
      prisma.workerUsageLogs.count({ where }),
    ]);

    const totalPages = isAll ? 1 : Math.ceil(total / limit);
    const currentPage = isAll ? 1 : Math.floor(offset / limit) + 1;

    return reply.send({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: isAll ? total : limit,
        offset: isAll ? 0 : offset,
        totalPages,
        currentPage,
      },
      message: 'Usage logs retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve usage logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
