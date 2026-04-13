import { FastifyRequest, FastifyReply } from 'fastify';

interface GetAgencyWorkersQuerystring {
  agency_user_id?: string;
  status?: 'active' | 'completed' | 'revoked';
  limit?: number;
  offset?: number;
  all?: boolean;
}

export async function getAgencyWorkersHandler(
  request: FastifyRequest<{ Querystring: GetAgencyWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const {
    agency_user_id,
    status,
    limit: queryLimit = 10,
    offset: queryOffset = 0,
    all,
  } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    const where = {
      deleted_at: null,
      ...(agency_user_id && { agency_user_id }),
      ...(status && { status }),
    };

    const assignmentSelect = {
      agency_worker_id: true,
      agency_user_id: true,
      worker_id: true,
      status: true,
      using_by: true,
      created_at: true,
      updated_at: true,
      agency: {
        select: { user_id: true, agency_name: true, phone_number: true },
      },
      worker: { select: { worker_id: true, name: true, status: true } },
      user: {
        select: { user_id: true, phone_number: true, role: true },
      },
    };

    const isAll = all === true || String(all) === 'true';
    const [assignments, total] = await Promise.all([
      prisma.agencyWorkers.findMany({
        where,
        select: assignmentSelect,
        orderBy: { created_at: 'desc' },
        ...(isAll ? {} : { skip: offset, take: limit }),
      }),
      prisma.agencyWorkers.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return reply.send({
      success: true,
      data: assignments,
      pagination: {
        total,
        limit,
        offset,
        totalPages,
        currentPage,
        all: isAll,
      },
      message: 'Agency workers retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve agency workers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
