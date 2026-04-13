import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';

interface GetUsersQuerystring {
  limit?: number;
  offset?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export const getUsersHandler = async (
  request: FastifyRequest<{ Querystring: GetUsersQuerystring }>,
  reply: FastifyReply,
) => {
  try {
    const { limit = 10, offset = 0, search, role, status } = request.query;

    const where = {
      deleted_at: null,
      ...(search && {
        OR: [
          { phone_number: { contains: search } },
          { agency_name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role }),
      ...(status && { status }),
    };

    const [users, total] = await Promise.all([
      request.server.prisma.users.findMany({
        where,
        select: {
          user_id: true,
          phone_number: true,
          agency_name: true,
          role: true,
          status: true,
          parent_user_id: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      request.server.prisma.users.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    reply.send({
      success: true,
      data: users,
      pagination: {
        total,
        limit,
        offset,
        totalPages,
        currentPage,
      },
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      message: 'Failed to retrieve users',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
