import { FastifyRequest, FastifyReply } from 'fastify';
import { ASSIGNMENT_STATUSES } from '@/utils/constants';

interface ReactivateAgencyWorkerParams {
  agencyWorkerId: string;
}

export async function reactivateAgencyWorkerHandler(
  request: FastifyRequest<{ Params: ReactivateAgencyWorkerParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agencyWorkerId } = request.params;

  try {
    const assignment = await prisma.agencyWorkers.findFirst({
      where: { agency_worker_id: agencyWorkerId, deleted_at: null },
    });

    if (!assignment) {
      return reply.status(404).send({
        success: false,
        message: 'Agency worker assignment not found',
      });
    }

    if (assignment.status !== 'revoked') {
      return reply.status(400).send({
        success: false,
        message: `Cannot reactivate an assignment that is "${assignment.status}"`,
      });
    }

    // If worker is active in another assignment, revoke it first
    const conflicting = await prisma.agencyWorkers.findFirst({
      where: {
        worker_id: assignment.worker_id,
        status: ASSIGNMENT_STATUSES.ACTIVE,
        deleted_at: null,
        NOT: { agency_worker_id: agencyWorkerId },
      },
    });

    if (conflicting) {
      await prisma.agencyWorkers.update({
        where: { agency_worker_id: conflicting.agency_worker_id },
        data: { status: ASSIGNMENT_STATUSES.REVOKED, using_by: null },
      });
    }

    await prisma.agencyWorkers.update({
      where: { agency_worker_id: agencyWorkerId },
      data: { status: ASSIGNMENT_STATUSES.ACTIVE, using_by: null },
    });

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
