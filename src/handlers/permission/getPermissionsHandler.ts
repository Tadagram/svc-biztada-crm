import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface GetPermissionsQuerystring {
  limit?: number;
  offset?: number;
  search?: string;
  all?: boolean;
}

function buildPermissionsWhere(search?: string) {
  return {
    deleted_at: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };
}

async function fetchPermissions(
  prisma: PrismaClient,
  where: any,
  limit: number,
  offset: number,
  isAll: boolean,
) {
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

  return { permissions, total };
}

function calculatePagination(total: number, limit: number, offset: number, isAll: boolean) {
  return {
    total,
    limit,
    offset,
    totalPages: Math.ceil(total / limit),
    currentPage: Math.floor(offset / limit) + 1,
    all: isAll,
  };
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetPermissionsQuerystring }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { limit: queryLimit = 20, offset: queryOffset = 0, search, all } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  try {
    const where = buildPermissionsWhere(search);
    const isAll = all === true || String(all) === 'true';
    const { permissions, total } = await fetchPermissions(prisma, where, limit, offset, isAll);
    const pagination = calculatePagination(total, limit, offset, isAll);

    return reply.send({
      success: true,
      data: permissions,
      pagination,
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
