import { FastifyRequest, FastifyReply } from 'fastify';

interface GetActiveWorkersQuerystring {
  agencyId?: string;
}

/**
 * GET /workers/active?agencyId=<uuid>
 * Returns workers that are currently assigned (active) to the given agency.
 * Each result includes the AgencyWorker assignment and nested Worker details.
 */
export async function getActiveWorkersHandler(
  request: FastifyRequest<{ Querystring: GetActiveWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agencyId } = request.query;

  try {
    const where = {
      status: 'active' as const,
      deleted_at: null,
      ...(agencyId && { agency_user_id: agencyId }),
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
