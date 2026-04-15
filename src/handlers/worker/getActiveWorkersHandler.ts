import { FastifyRequest, FastifyReply } from 'fastify';

interface GetActiveWorkersQuerystring {
  agencyId?: string;
}

/**
 * GET /workers/active?agencyId=<uuid>
 * Returns workers that are currently assigned (active) to the given agency.
 * Each result includes the AgencyWorker assignment and nested Worker details.
 */
function buildActiveWorkerIsolation(caller: {
  userId: string;
  role: string;
}): Record<string, string> | null {
  if (caller.role === 'mod') return {};
  if (caller.role === 'agency') return { agency_user_id: caller.userId };
  if (caller.role === 'user') return { using_by: caller.userId };
  return null;
}

export async function getActiveWorkersHandler(
  request: FastifyRequest<{ Querystring: GetActiveWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agencyId } = request.query;

  try {
    const caller = request.user;
    const isolation = buildActiveWorkerIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const where = {
      status: 'active' as const,
      deleted_at: null,
      ...isolation,
      ...(caller.role === 'mod' && agencyId && { agency_user_id: agencyId }),
    };

    const assignments = await prisma.agencyWorkers.findMany({
      where,
      select: {
        agency_worker_id: true,
        agency_user_id: true,
        worker_id: true,
        using_by: true,
        status: true,
        created_at: true,
        updated_at: true,
        agency: {
          select: { user_id: true, agency_name: true, phone_number: true },
        },
        worker: {
          select: { worker_id: true, name: true, status: true },
        },
        user: {
          select: { user_id: true, phone_number: true, role: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({
      success: true,
      data: assignments,
      total: assignments.length,
      message: 'Active workers retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve active workers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
