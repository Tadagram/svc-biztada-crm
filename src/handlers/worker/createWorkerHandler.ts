import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { WORKER_STATUSES, type WorkerStatus } from '@/utils/constants';

interface CreateWorkerBody {
  name: string;
  status?: WorkerStatus;
}

const workerSelect = {
  worker_id: true,
  name: true,
  status: true,
  created_at: true,
  updated_at: true,
};

async function createNewWorker(prisma: PrismaClient, name: string, status: WorkerStatus) {
  return prisma.workers.create({
    data: { name, status },
    select: workerSelect,
  });
}

export async function handler(
  request: FastifyRequest<{ Body: CreateWorkerBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { name, status = WORKER_STATUSES.READY } = request.body;

  try {
    const worker = await createNewWorker(prisma, name, status);

    return reply.status(201).send({
      success: true,
      data: worker,
      message: 'Worker created successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to create worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
