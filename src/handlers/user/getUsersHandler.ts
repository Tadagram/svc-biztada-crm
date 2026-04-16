import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, PrismaClient } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface GetUsersQuerystring {
  limit?: number;
  offset?: number;
  search?: string;
  role?: UserRole;
  not_role?: UserRole;
  all?: boolean;
  status?: 'active' | 'disabled' | 'deleted';
  parent_user_id?: string;
  lifecycle?: 'active' | 'new' | 'dormant';
}

function buildUserIsolation(caller: {
  userId: string;
  role: string | null;
  parentUserId?: string | null;
}): Record<string, any> | null {
  // null role = admin, full access
  if (caller.role === null || caller.role === UserRole.mod) {
    return {};
  }

  if (caller.role === UserRole.agency) {
    return {
      OR: [{ user_id: caller.userId }, { parent_user_id: caller.userId }],
    };
  }

  if (caller.role === UserRole.user) {
    return {
      OR: [{ user_id: caller.userId }, { user_id: caller.parentUserId }],
    };
  }

  return null;
}

function buildWhereClause(
  isolation: any,
  search?: string,
  role?: UserRole,
  not_role?: UserRole,
  status?: string,
  parentUserId?: string,
  isModCaller?: boolean,
) {
  const isDeletedFilter = status === 'deleted';
  const deletedAtFilter = !status
    ? {}
    : isDeletedFilter
      ? { deleted_at: { not: null } }
      : { deleted_at: null };

  const parentFilter = isModCaller && parentUserId ? { parent_user_id: parentUserId } : {};

  return {
    ...deletedAtFilter,
    ...isolation,
    ...parentFilter,
    ...(search && {
      OR: [
        { phone_number: { contains: search } },
        { agency_name: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(role && { role }),
    ...(not_role && { NOT: { role: not_role } }),
    ...(!isDeletedFilter && status && { status }),
  };
}

async function fetchUsers(
  prisma: PrismaClient,
  where: any,
  select: any,
  limit: number,
  offset: number,
) {
  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      select,
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' },
    }),
    prisma.users.count({ where }),
  ]);
  return { users, total };
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetUsersQuerystring }>,
  reply: FastifyReply,
) {
  try {
    const {
      limit: queryLimit = 10,
      offset: queryOffset = 0,
      search,
      role,
      not_role,
      status,
      parent_user_id,
      lifecycle,
    } = request.query;

    const limit = Number(queryLimit);
    const offset = Number(queryOffset);
    const caller = request.user;
    const isolation = buildUserIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const userSelect = {
      user_id: true,
      phone_number: true,
      agency_name: true,
      role: true,
      status: true,
      parent_user_id: true,
      last_active_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    };

    let where: any = buildWhereClause(
      isolation,
      search,
      role,
      not_role,
      status,
      parent_user_id,
      caller.role === USER_ROLES.MOD,
    );

    if (lifecycle) {
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
      if (lifecycle === 'active') {
        where = { ...where, last_active_at: { not: null, gte: fourteenDaysAgo } };
      } else if (lifecycle === 'new') {
        where = { ...where, last_active_at: null, created_at: { gte: sevenDaysAgo } };
      } else if (lifecycle === 'dormant') {
        where = {
          ...where,
          OR: [
            { last_active_at: { not: null, lt: fourteenDaysAgo } },
            { last_active_at: null, created_at: { lt: sevenDaysAgo } },
          ],
        };
      }
    }

    const { users, total } = await fetchUsers(
      request.server.prisma,
      where,
      userSelect,
      limit,
      offset,
    );

    return reply.send({
      success: true,
      data: users,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
