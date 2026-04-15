import { FastifyRequest, FastifyReply } from 'fastify';
import { WORKER_STATUSES } from '@/utils/constants';

interface ReactivateWorkerParams {
  workerId: string;
}

export async function reactivateWorkerHandler(
  request: FastifyRequest<{ Params: ReactivateWorkerParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { workerId } = request.params;

  try {
    const existing = await prisma.workers.findFirst({
      where: { worker_id: workerId, deleted_at: { not: null } },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        message: 'Deleted worker not found',
      });
    }

    const reactivated = await prisma.workers.update({
      where: { worker_id: workerId },
      data: {
        deleted_at: null,
        status: WORKER_STATUSES.OFFLINE,
        updated_at: new Date(),
      },
      select: {
        worker_id: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    return reply.send({
      success: true,
      data: reactivated,
      message: 'Worker reactivated successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to reactivate worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
