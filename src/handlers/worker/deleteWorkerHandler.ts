import { FastifyRequest, FastifyReply } from 'fastify';

interface DeleteWorkerParams {
  workerId: string;
}

export async function deleteWorkerHandler(
  request: FastifyRequest<{ Params: DeleteWorkerParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { workerId } = request.params;

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

    const activeAssignment = await prisma.agencyWorkers.findFirst({
      where: {
        worker_id: workerId,
        status: 'active',
        deleted_at: null,
        using_by: { not: null },
      },
    });

    if (activeAssignment) {
      return reply.status(409).send({
        success: false,
        message: 'Không thể xóa worker đang được sử dụng. Vui lòng thu hồi trước.',
      });
    }

    const deleted = await prisma.workers.update({
      where: { worker_id: workerId },
      data: { deleted_at: new Date() },
      select: {
        worker_id: true,
        name: true,
        status: true,
        deleted_at: true,
      },
    });

    return reply.send({
      success: true,
      data: deleted,
      message: 'Worker deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to delete worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
