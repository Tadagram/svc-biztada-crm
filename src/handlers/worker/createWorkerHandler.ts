import { FastifyRequest, FastifyReply } from 'fastify';

interface CreateWorkerBody {
  name: string;
  status?: 'ready' | 'busy' | 'offline';
}

export async function createWorkerHandler(
  request: FastifyRequest<{ Body: CreateWorkerBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { name, status = 'ready' } = request.body;

  try {
    const worker = await prisma.workers.create({
      data: { name, status },
      select: {
        worker_id: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

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
