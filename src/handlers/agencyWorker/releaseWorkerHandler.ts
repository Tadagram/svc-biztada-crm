import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface ReleaseWorkerParams {
  agencyWorkerId: string;
}

export async function releaseWorkerHandler(
  request: FastifyRequest<{ Params: ReleaseWorkerParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agencyWorkerId } = request.params;

  try {
    const caller = request.user as { userId: string; role: UserRole };

    const assignment = await prisma.agencyWorkers.findFirst({
      where: {
        agency_worker_id: agencyWorkerId,
        deleted_at: null,
        ...(caller.role === USER_ROLES.AGENCY && { agency_user_id: caller.userId }),
      },
    });

    if (!assignment) {
      return reply.status(404).send({
        success: false,
        message: 'Agency worker assignment not found',
      });
    }

    if (!assignment.using_by) {
      return reply.status(400).send({
        success: false,
        message: 'Worker is not currently assigned to any user',
      });
    }

    await prisma.$transaction(async (tx) => {
      // Close usage log
      await tx.workerUsageLogs.updateMany({
        where: {
          worker_id: assignment.worker_id,
          agency_user_id: assignment.agency_user_id,
          end_at: null,
        },
        data: { end_at: new Date() },
      });

      // Clear using_by
      await tx.agencyWorkers.update({
        where: { agency_worker_id: agencyWorkerId },
        data: { using_by: null },
      });
    });

    return reply.send({
      success: true,
      message: 'Worker released from user successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to release worker from user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
