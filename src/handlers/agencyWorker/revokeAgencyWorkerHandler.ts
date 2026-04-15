import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ASSIGNMENT_STATUSES, WORKER_STATUSES } from '@/utils/constants';

interface RevokeAgencyWorkerParams {
  agencyWorkerId: string;
}

async function getAssignment(prisma: PrismaClient, agencyWorkerId: string) {
  return prisma.agencyWorkers.findFirst({
    where: { agency_worker_id: agencyWorkerId, deleted_at: null },
  });
}

async function revokeAssignmentTransaction(
  prisma: PrismaClient,
  agencyWorkerId: string,
  assignment: any,
) {
  return prisma.$transaction(async (tx) => {
    await tx.workerUsageLogs.updateMany({
      where: {
        worker_id: assignment.worker_id,
        agency_user_id: assignment.agency_user_id,
        end_at: null,
      },
      data: { end_at: new Date() },
    });

    await tx.agencyWorkers.update({
      where: { agency_worker_id: agencyWorkerId },
      data: { status: ASSIGNMENT_STATUSES.REVOKED, using_by: null },
    });

    await tx.workers.update({
      where: { worker_id: assignment.worker_id },
      data: { status: WORKER_STATUSES.READY },
    });
  });
}

export async function handler(
  request: FastifyRequest<{ Params: RevokeAgencyWorkerParams }>,
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

    if (assignment.status !== ASSIGNMENT_STATUSES.ACTIVE) {
      return reply.status(400).send({
        success: false,
        message: `Cannot revoke an assignment that is already "${assignment.status}"`,
      });
    }

    await revokeAssignmentTransaction(prisma, agencyWorkerId, assignment);

    return reply.send({
      success: true,
      message: 'Worker assignment revoked successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to revoke agency worker assignment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
