import { FastifyRequest, FastifyReply } from 'fastify';
import { type WorkerStatus } from '@/utils/constants';

interface UpdateWorkerParams {
  workerId: string;
}

interface UpdateWorkerBody {
  name?: string;
  status?: WorkerStatus;
}

export async function updateWorkerHandler(
  request: FastifyRequest<{ Params: UpdateWorkerParams; Body: UpdateWorkerBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { workerId } = request.params;
  const { name, status } = request.body;

  try {
    const existing = await prisma.workers.findFirst({
      where: { worker_id: workerId, deleted_at: null },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        message: 'Worker not found',
      });
    }

    const updated = await prisma.workers.update({
      where: { worker_id: workerId },
      data: {
        ...(name && { name }),
        ...(status && { status }),
      },
      select: {
        worker_id: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return reply.send({
      success: true,
      data: updated,
      message: 'Worker updated successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to update worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
