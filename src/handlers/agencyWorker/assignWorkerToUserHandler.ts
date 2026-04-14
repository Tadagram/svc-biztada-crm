import { FastifyRequest, FastifyReply } from 'fastify';

interface AssignWorkerToUserParams {
  agencyWorkerId: string;
}

interface AssignWorkerToUserBody {
  user_id: string;
}

export async function assignWorkerToUserHandler(
  request: FastifyRequest<{
    Params: AssignWorkerToUserParams;
    Body: AssignWorkerToUserBody;
  }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agencyWorkerId } = request.params;
  const { user_id } = request.body;

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

    if (assignment.status !== 'active') {
      return reply.status(400).send({
        success: false,
        message: 'Worker assignment is not active',
      });
    }

    const user = await prisma.users.findFirst({
      where: {
        user_id,
        parent_user_id: assignment.agency_user_id,
        deleted_at: null,
      },
    });

    if (!user) {
      return reply.status(403).send({
        success: false,
        message: 'User does not belong to this agency',
      });
    }

    await prisma.$transaction(async (tx) => {
      if (assignment.using_by) {
        await tx.workerUsageLogs.updateMany({
          where: {
            worker_id: assignment.worker_id,
            agency_user_id: assignment.agency_user_id,
            end_at: null,
          },
          data: { end_at: new Date() },
        });
      }

      await tx.agencyWorkers.update({
        where: { agency_worker_id: agencyWorkerId },
        data: { using_by: user_id },
      });

      await tx.workerUsageLogs.create({
        data: {
          worker_id: assignment.worker_id,
          agency_user_id: assignment.agency_user_id,
          user_id,
          start_at: new Date(),
        },
      });
    });

    return reply.send({
      success: true,
      message: 'Worker assigned to user successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to assign worker to user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
