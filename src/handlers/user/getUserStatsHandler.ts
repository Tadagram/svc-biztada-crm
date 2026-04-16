import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

interface GetUserStatsQuerystring {
  role?: UserRole;
  status?: 'active' | 'disabled' | 'deleted';
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetUserStatsQuerystring }>,
  reply: FastifyReply,
) {
  try {
    const { role, status } = request.query;
    const prisma = request.server.prisma;

    const isDeletedFilter = status === 'deleted';
    const baseWhere: Record<string, any> = {
      role: { not: UserRole.user },
      ...(role ? { role } : {}),
      ...(!status
        ? { deleted_at: null }
        : isDeletedFilter
          ? { deleted_at: { not: null } }
          : { deleted_at: null }),
      ...(!isDeletedFilter && status ? { status } : {}),
    };

    const [total, active, agencies, mods] = await Promise.all([
      prisma.users.count({ where: baseWhere }),
      prisma.users.count({
        where: { ...baseWhere, status: 'active' },
      }),
      prisma.users.count({
        where: { ...baseWhere, role: UserRole.agency },
      }),
      prisma.users.count({
        where: { ...baseWhere, role: UserRole.mod },
      }),
    ]);

    return reply.send({
      success: true,
      data: { total, active, agencies, mods },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch user stats',
    });
  }
}
