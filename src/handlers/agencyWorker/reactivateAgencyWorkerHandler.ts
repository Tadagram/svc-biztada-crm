import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ASSIGNMENT_STATUSES } from '@/utils/constants';

interface ReactivateAgencyWorkerParams {
  agencyWorkerId: string;
}

async function getAssignment(prisma: PrismaClient, agencyWorkerId: string) {
  return prisma.agencyWorkers.findFirst({
    where: { agency_worker_id: agencyWorkerId, deleted_at: null },
  });
}

async function findConflictingAssignment(
  prisma: PrismaClient,
  worker_id: string,
  agencyWorkerId: string,
) {
  return prisma.agencyWorkers.findFirst({
    where: {
      worker_id,
      status: ASSIGNMENT_STATUSES.ACTIVE,
      deleted_at: null,
      NOT: { agency_worker_id: agencyWorkerId },
    },
  });
}

async function revokeConflictingAssignment(
  prisma: PrismaClient,
  conflicting_agency_worker_id: string,
) {
  return prisma.agencyWorkers.update({
    where: { agency_worker_id: conflicting_agency_worker_id },
    data: { status: ASSIGNMENT_STATUSES.REVOKED, using_by: null },
  });
}

async function reactivateAssignmentTransaction(
  prisma: PrismaClient,
  agencyWorkerId: string,
  assignment: any,
) {
  const conflicting = await findConflictingAssignment(prisma, assignment.worker_id, agencyWorkerId);

  if (conflicting) {
    await revokeConflictingAssignment(prisma, conflicting.agency_worker_id);
  }

  return prisma.agencyWorkers.update({
    where: { agency_worker_id: agencyWorkerId },
    data: { status: ASSIGNMENT_STATUSES.ACTIVE, using_by: null },
  });
}

export async function handler(
  request: FastifyRequest<{ Params: ReactivateAgencyWorkerParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agencyWorkerId } = request.params;

  try {
    const assignment = await getAssignment(prisma, agencyWorkerId);

    if (!assignment) {
      return reply.status(404).send({
        success: false,
        message: 'Agency worker assignment not found',
      });
    }

    if (assignment.status !== ASSIGNMENT_STATUSES.REVOKED) {
      return reply.status(400).send({
        success: false,
        message: `Cannot reactivate an assignment that is "${assignment.status}"`,
      });
    }

    await reactivateAssignmentTransaction(prisma, agencyWorkerId, assignment);

    return reply.send({
      success: true,
      message: 'Assignment reactivated successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to reactivate assignment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
