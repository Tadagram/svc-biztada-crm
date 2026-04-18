import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AssignmentStatus } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface GetAgencyWorkersQuerystring {
  status?: AssignmentStatus;
  limit?: number;
  offset?: number;
  all?: boolean;
  agency_user_id?: string;
}

function buildAgencyWorkerIsolation(caller: {
  userId: string;
  role: UserRole | null;
}): Record<string, string> | null {
  if (caller.role === null) return {}; // admin → full access
  if (caller.role === USER_ROLES.MOD) return {};
  if (caller.role === USER_ROLES.AGENCY) return { agency_user_id: caller.userId };
  if (caller.role === USER_ROLES.USER) return { using_by: caller.userId };
  return null;
}

function buildWhereClause(
  isolation: Record<string, string>,
  caller: { userId: string; role: UserRole },
  status?: AssignmentStatus,
  agency_user_id?: string,
) {
  const agencyFilter =
    (caller.role === null || caller.role === USER_ROLES.MOD) && agency_user_id
      ? { agency_user_id }
      : {};

  return {
    deleted_at: null,
    ...isolation,
    ...agencyFilter,
    ...(status && { status }),
  };
}

function buildAssignmentSelect() {
  return {
    agency_worker_id: true,
    agency_user_id: true,
    worker_id: true,
    status: true,
    using_by: true,
    created_at: true,
    updated_at: true,
    agency: { select: { user_id: true, agency_name: true, phone_number: true } },
    worker: { select: { worker_id: true, name: true, status: true } },
    user: { select: { user_id: true, phone_number: true, role: true, agency_name: true } },
  };
}

function calculatePagination(total: number, limit: number, offset: number, isAll: boolean) {
  return {
    total,
    limit,
    offset,
    totalPages: Math.ceil(total / limit),
    currentPage: Math.floor(offset / limit) + 1,
    all: isAll,
  };
}

async function fetchAssignments(
  prisma: any,
  where: any,
  isAll: boolean,
  limit: number,
  offset: number,
) {
  const assignmentSelect = buildAssignmentSelect();

  const [assignments, total] = await Promise.all([
    prisma.agencyWorkers.findMany({
      where,
      select: assignmentSelect,
      orderBy: { created_at: 'desc' },
      ...(isAll ? {} : { skip: offset, take: limit }),
    }),
    prisma.agencyWorkers.count({ where }),
  ]);

  return { assignments, total };
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetAgencyWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const {
    status,
    limit: queryLimit = 10,
    offset: queryOffset = 0,
    all,
    agency_user_id,
  } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    const caller = request.user as { userId: string; role: UserRole };
    const isolation = buildAgencyWorkerIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const where = buildWhereClause(isolation, caller, status, agency_user_id);
    const isAll = all === true || String(all) === 'true';
    const { assignments, total } = await fetchAssignments(prisma, where, isAll, limit, offset);
    const pagination = calculatePagination(total, limit, offset, isAll);

    return reply.send({
      success: true,
      data: assignments,
      pagination,
      message: 'Agency workers retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve agency workers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
