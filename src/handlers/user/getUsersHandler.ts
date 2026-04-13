import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';

interface GetUsersQuerystring {
  limit?: number;
  offset?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  all?: boolean;
  parent_user_id?: string;
}

export const getUsersHandler = async (
  request: FastifyRequest<{ Querystring: GetUsersQuerystring }>,
  reply: FastifyReply,
) => {
  try {
    const {
      limit: queryLimit = 10,
      offset: queryOffset = 0,
      search,
      role,
      status,
      all,
      parent_user_id,
    } = request.query;
    const limit = Number(queryLimit);
    const offset = Number(queryOffset);

    let isolatedParentId: string | undefined = parent_user_id;

    try {
      await request.jwtVerify();
      const caller = request.user;
      const callerIsAgency = caller?.role === UserRole.agency;

      if (callerIsAgency) {
        isolatedParentId = caller.userId;
      }
    } catch (error) {
      console.error(
        'Failed to verify JWT for getUsersHandler. Proceeding without user context.',
        error,
      );
    }

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
      ...(isolatedParentId && { parent_user_id: isolatedParentId }),
    };

    const userSelect = {
      user_id: true,
      phone_number: true,
      agency_name: true,
      role: true,
      status: true,
      parent_user_id: true,
      created_at: true,
      updated_at: true,
    };

    const isAll = all === true || String(all) === 'true';
    const [users, total] = await Promise.all([
      request.server.prisma.users.findMany({
        where,
        select: userSelect,
        orderBy: { created_at: 'desc' },
        ...(isAll ? {} : { skip: offset, take: limit }),
      }),
      request.server.prisma.users.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return reply.send({
      success: true,
      data: users,
      pagination: {
        total,
        limit,
        offset,
        totalPages,
        currentPage,
        all: isAll,
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
