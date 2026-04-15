import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES, ASSIGNMENT_STATUSES } from '@/utils/constants';

interface GetActiveWorkersQuerystring {
  agencyId?: string;
}

function buildActiveWorkerIsolation(caller: {
  userId: string;
  role: UserRole;
}): Record<string, string> | null {
  if (caller.role === USER_ROLES.MOD) return {};
  if (caller.role === USER_ROLES.AGENCY) return { agency_user_id: caller.userId };
  if (caller.role === USER_ROLES.USER) return { using_by: caller.userId };
  return null;
}

const assignmentSelect = {
  agency_worker_id: true,
  agency_user_id: true,
  worker_id: true,
  using_by: true,
  status: true,
  created_at: true,
  updated_at: true,
  agency: {
    select: { user_id: true, agency_name: true, phone_number: true },
  },
  worker: {
    select: { worker_id: true, name: true, status: true },
  },
  user: {
    select: { user_id: true, phone_number: true, role: true },
  },
};

async function fetchActiveAssignments(prisma: PrismaClient, where: any) {
  return prisma.agencyWorkers.findMany({
    where,
    select: assignmentSelect,
    orderBy: { created_at: 'desc' },
  });
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetActiveWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agencyId } = request.query;

  try {
    const caller = request.user as { userId: string; role: UserRole };
    const isolation = buildActiveWorkerIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const where = {
      status: ASSIGNMENT_STATUSES.ACTIVE,
      deleted_at: null,
      ...isolation,
      ...(caller.role === USER_ROLES.MOD && agencyId && { agency_user_id: agencyId }),
    };

    const assignments = await fetchActiveAssignments(prisma, where);

    return reply.send({
      success: true,
      data: assignments,
      total: assignments.length,
      message: 'Active workers retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve active workers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
