import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

interface GetUsersQuerystring {
  limit?: number;
  offset?: number;
  search?: string;
  role?: UserRole;
  all?: boolean;
  status?: 'active' | 'disabled' | 'deleted';
}

function buildUserIsolation(caller: {
  userId: string;
  role: string;
  parentUserId?: string | null;
}): Record<string, string> | null {
  if (caller.role === UserRole.mod) {
    return {};
  }

  if (caller.role === UserRole.agency) {
    return { parent_user_id: caller.userId };
  }

  if (caller.role === UserRole.user) {
    return { parent_user_id: caller.parentUserId ?? '' };
  }

  // Customer không có quyền xem danh sách users
  return null;
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
      all,
      status,
    } = request.query;

    const limit = Number(queryLimit);
    const offset = Number(queryOffset);
    const caller = request.user;
    const isolation = buildUserIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const isDeletedFilter = status === 'deleted';
    const deletedAtFilter = !status
      ? {}
      : isDeletedFilter
        ? { deleted_at: { not: null } }
        : { deleted_at: null };

    const where = {
      ...deletedAtFilter,
      ...isolation,
      ...(search && {
        OR: [
          { phone_number: { contains: search } },
          { agency_name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role }),
      ...(!isDeletedFilter && status && { status }),
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
      deleted_at: true,
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
      pagination: { total, limit, offset, totalPages, currentPage, all: isAll },
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
