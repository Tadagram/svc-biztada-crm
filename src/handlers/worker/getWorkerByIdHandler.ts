import { FastifyRequest, FastifyReply } from 'fastify';

interface GetWorkerByIdParams {
  workerId: string;
}

export async function getWorkerByIdHandler(
  request: FastifyRequest<{ Params: GetWorkerByIdParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { workerId } = request.params;
  const caller = request.user;

  try {
    // Build isolation filter so non-mod users can only see workers related to them
    const isolationFilter =
      caller.role === 'agency'
        ? { agencyWorkers: { some: { agency_user_id: caller.userId, deleted_at: null } } }
        : caller.role === 'user'
          ? { agencyWorkers: { some: { using_by: caller.userId, deleted_at: null } } }
          : {};

    const worker = await prisma.workers.findFirst({
      where: { worker_id: workerId, deleted_at: null, ...isolationFilter },
      select: {
        worker_id: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
        agency_workers: {
          where: { deleted_at: null },
          select: {
            agency_worker_id: true,
            status: true,
            using_by: true,
            agency: {
              select: { user_id: true, agency_name: true, phone_number: true },
            },
          },
          take: 1,
        },
      },
    });

    if (!worker) {
      return reply.status(404).send({
        success: false,
        message: 'Worker not found',
      });
    }

    return reply.send({
      success: true,
      data: worker,
      message: 'Worker retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
