import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface GetWorkerByIdParams {
  workerId: string;
}

function buildIsolationFilter(callerRole: UserRole, callerId: string): Record<string, any> {
  if (callerRole === USER_ROLES.AGENCY) {
    return { agencyWorkers: { some: { agency_user_id: callerId, deleted_at: null } } };
  }
  if (callerRole === USER_ROLES.USER) {
    return { agencyWorkers: { some: { using_by: callerId, deleted_at: null } } };
  }
  return {};
}

async function fetchWorker(
  prisma: PrismaClient,
  workerId: string,
  isolationFilter: Record<string, any>,
) {
  return prisma.workers.findFirst({
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
}

export async function handler(
  request: FastifyRequest<{ Params: GetWorkerByIdParams }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { workerId } = request.params;
  const caller = request.user as { userId: string; role: UserRole };

  try {
    const isolationFilter = buildIsolationFilter(caller.role, caller.userId);
    const worker = await fetchWorker(prisma, workerId, isolationFilter);

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
