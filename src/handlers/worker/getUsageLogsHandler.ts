import { FastifyRequest, FastifyReply } from 'fastify';

interface GetUsageLogsQuerystring {
  workerId?: string;
  agencyId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  /** Filter only open (ongoing) logs: end_at IS NULL */
  open?: boolean;
}

/**
 * GET /usage-logs?workerId=&agencyId=&userId=&limit=&offset=
 * Returns worker usage history with pagination.
 */
export async function getUsageLogsHandler(
  request: FastifyRequest<{ Querystring: GetUsageLogsQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const {
    workerId,
    agencyId,
    userId,
    limit: queryLimit = 10,
    offset: queryOffset = 0,
    open,
  } = request.query;

  const limit = Number(queryLimit);
  const offset = Number(queryOffset);
  const isOpen = open === true || String(open) === 'true';

  try {
    const where = {
      ...(workerId && { worker_id: workerId }),
      ...(agencyId && { agency_user_id: agencyId }),
      ...(userId && { user_id: userId }),
      ...(isOpen && { end_at: null }),
    };

    const select = {
      usage_log_id: true,
      worker_id: true,
      agency_user_id: true,
      user_id: true,
      start_at: true,
      end_at: true,
      metadata: true,
      created_at: true,
      worker: { select: { worker_id: true, name: true, status: true } },
      agency: { select: { user_id: true, agency_name: true, phone_number: true } },
      user: { select: { user_id: true, phone_number: true, role: true } },
    };

    const [logs, total] = await Promise.all([
      prisma.workerUsageLogs.findMany({
        where,
        select,
        orderBy: { start_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.workerUsageLogs.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return reply.send({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        totalPages,
        currentPage,
      },
      message: 'Usage logs retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve usage logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
