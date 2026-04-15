import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES, type WorkerStatus } from '@/utils/constants';

interface GetWorkersQuerystring {
  limit?: number;
  offset?: number;
  status?: WorkerStatus | 'deleted';
  all?: boolean;
  search?: string;
}

function buildWorkerIsolation(caller: {
  userId: string;
  role: UserRole;
}): Record<string, unknown> | null {
  if (caller.role === USER_ROLES.MOD) return {};
  if (caller.role === USER_ROLES.AGENCY) {
    return { agency_workers: { some: { agency_user_id: caller.userId, deleted_at: null } } };
  }
  if (caller.role === USER_ROLES.USER) {
    return { agency_workers: { some: { using_by: caller.userId, deleted_at: null } } };
  }
  return null; // customer → block
}

function buildWhereClause(isolation: any, status?: WorkerStatus | 'deleted', search?: string) {
  const isDeletedFilter = status === 'deleted';
  const deletedAtFilter = isDeletedFilter ? { deleted_at: { not: null } } : { deleted_at: null };

  return {
    ...deletedAtFilter,
    ...isolation,
    ...(!isDeletedFilter && status && { status }),
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
  };
}

const workerSelect = {
  worker_id: true,
  name: true,
  status: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
};

async function fetchWorkers(prisma: PrismaClient, where: any, limit: number, offset: number) {
  const [workers, total] = await Promise.all([
    prisma.workers.findMany({
      where,
      select: workerSelect,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.workers.count({ where }),
  ]);
  return { workers, total };
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { limit: queryLimit = 10, offset: queryOffset = 0, status, search } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    const caller = request.user as { userId: string; role: UserRole };
    const isolation = buildWorkerIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const where = buildWhereClause(isolation, status, search);
    const { workers, total } = await fetchWorkers(prisma, where, limit, offset);

    return reply.send({
      success: true,
      data: workers,
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
      message: 'Failed to fetch workers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
