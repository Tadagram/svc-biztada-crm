import { FastifyRequest, FastifyReply } from 'fastify';

interface GetPermissionsQuerystring {
  limit?: number;
  offset?: number;
  search?: string;
  all?: boolean;
}

export async function getPermissionsHandler(
  request: FastifyRequest<{ Querystring: GetPermissionsQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { limit: queryLimit = 20, offset: queryOffset = 0, search, all } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    const where = {
      deleted_at: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const isAll = all === true || String(all) === 'true';
    const [permissions, total] = await Promise.all([
      prisma.permissions.findMany({
        where,
        select: {
          permission_id: true,
          name: true,
          code: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: 'desc' },
        ...(isAll ? {} : { skip: offset, take: limit }),
      }),
      prisma.permissions.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return reply.send({
      success: true,
      data: permissions,
      pagination: {
        total,
        limit,
        offset,
        totalPages,
        currentPage,
        all: isAll,
      },
      message: 'Permissions retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to retrieve permissions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
