import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ASSIGNMENT_STATUSES } from '@/utils/constants';

interface DeleteWorkerParams {
  workerId: string;
}

const workerSelect = {
  worker_id: true,
  name: true,
  status: true,
  deleted_at: true,
};

async function getWorker(prisma: PrismaClient, workerId: string) {
  return prisma.workers.findFirst({
    where: { worker_id: workerId, deleted_at: null },
  });
}

async function checkActiveAssignment(prisma: PrismaClient, workerId: string) {
  return prisma.agencyWorkers.findFirst({
    where: {
      worker_id: workerId,
      status: ASSIGNMENT_STATUSES.ACTIVE,
      deleted_at: null,
      using_by: { not: null },
    },
  });
}

async function softDeleteWorker(prisma: PrismaClient, workerId: string) {
  return prisma.workers.update({
    where: { worker_id: workerId },
    data: { deleted_at: new Date() },
    select: workerSelect,
  });
}

export async function handler(
  request: FastifyRequest<{ Params: DeleteWorkerParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { workerId } = request.params;

  try {
    const existing = await getWorker(prisma, workerId);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        message: 'Worker not found',
      });
    }

    const activeAssignment = await checkActiveAssignment(prisma, workerId);
    if (activeAssignment) {
      return reply.status(409).send({
        success: false,
        message: 'Không thể xóa worker đang được sử dụng. Vui lòng thu hồi trước.',
      });
    }

    const deleted = await softDeleteWorker(prisma, workerId);

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
