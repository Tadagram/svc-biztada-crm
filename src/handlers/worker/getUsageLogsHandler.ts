import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface GetUsageLogsQuerystring {
  workerId?: string;
  workerName?: string;
  agencyId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  open?: boolean;
  from?: string;
  to?: string;
  all?: boolean;
}

const logSelect = {
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

async function resolveWorkerIds(prisma: PrismaClient, workerName: string) {
  const matchingWorkers = await prisma.workers.findMany({
    where: { name: { contains: workerName, mode: 'insensitive' } },
    select: { worker_id: true },
  });
  return matchingWorkers.map((w) => w.worker_id);
}

function buildWhereClause(
  isolation: any,
  workerId?: string,
  resolvedWorkerIds?: string[],
  agencyId?: string,
  userId?: string,
  isOpen?: boolean,
  from?: string,
  to?: string,
  isModCaller?: boolean,
) {
  return {
    ...isolation,
    ...(workerId && { worker_id: workerId }),
    ...(resolvedWorkerIds && { worker_id: { in: resolvedWorkerIds } }),
    ...(isModCaller && agencyId && { agency_user_id: agencyId }),
    ...(isModCaller && userId && { user_id: userId }),
    ...(isOpen && { end_at: null }),
    ...((from || to) && {
      start_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };
}

async function fetchLogs(prisma: PrismaClient, where: any, limit: number, offset: number) {
  const [logs, total] = await Promise.all([
    prisma.workerUsageLogs.findMany({
      where,
      select: logSelect,
      orderBy: { start_at: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.workerUsageLogs.count({ where }),
  ]);
  return { logs, total };
}

export async function handler(
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
  } = request.query;

  const caller = request.user as { userId: string; role: UserRole };

  // Only MOD can access detailed usage logs
  if (caller.role !== USER_ROLES.MOD) {
    return reply.status(403).send({
      success: false,
      message: 'Only administrators can access detailed usage logs',
    });
  }

  const limit = Number(queryLimit);
  const offset = Number(queryOffset);
  const isOpen = open === true || String(open) === 'true';

  try {
    let resolvedWorkerIds: string[] | undefined;

    if (workerName) {
      const allWorkerIds = await resolveWorkerIds(prisma, workerName);
      if (allWorkerIds.length === 0) {
        return reply.send({
          success: true,
          data: [],
          pagination: { total: 0, limit, offset, pages: 0 },
        });
      }
      resolvedWorkerIds = allWorkerIds;
    }

    const where = buildWhereClause(
      {},
      workerId,
      resolvedWorkerIds,
      agencyId,
      userId,
      isOpen,
      from,
      to,
      true,
    );

    const { logs, total } = await fetchLogs(prisma, where, limit, offset);

    return reply.send({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch usage logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
