import { FastifyRequest, FastifyReply } from 'fastify';

interface GetWorkersQuerystring {
  limit?: number;
  offset?: number;
  status?: 'ready' | 'busy' | 'offline' | 'deleted';
  all?: boolean;
  search?: string;
}

function buildWorkerIsolation(caller: {
  userId: string;
  role: string;
}): Record<string, unknown> | null {
  if (caller.role === 'mod') return {};
  if (caller.role === 'agency') {
    return { agencyWorkers: { some: { agency_user_id: caller.userId, deleted_at: null } } };
  }
  if (caller.role === 'user') {
    return { agencyWorkers: { some: { using_by: caller.userId, deleted_at: null } } };
  }
  return null; // customer → block
}

export async function getWorkersHandler(
  request: FastifyRequest<{ Querystring: GetWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { limit: queryLimit = 10, offset: queryOffset = 0, status, search, all } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    const caller = request.user;
    const isolation = buildWorkerIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const isDeletedFilter = status === 'deleted';
    const deletedAtFilter = isDeletedFilter ? { deleted_at: { not: null } } : { deleted_at: null };

    const where = {
      ...deletedAtFilter,
      ...isolation,
      ...(!isDeletedFilter && status && { status }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    const workerSelect = {
      worker_id: true,
      name: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    };

    const isAll = all === true || String(all) === 'true';
    const [workers, total] = await Promise.all([
      prisma.workers.findMany({
        where,
        select: workerSelect,
        orderBy: { created_at: 'desc' },
        ...(isAll ? {} : { skip: offset, take: limit }),
      }),
      prisma.workers.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return reply.send({
      success: true,
      data: workers,
      pagination: { total, limit, offset, totalPages, currentPage, all: isAll },
      message: 'Workers retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve workers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
