import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface GetWorkerStatsQuerystring {
  status?: string;
}

function buildWorkerIsolation(caller: {
  userId: string;
  role: UserRole;
}): Record<string, unknown> | null {
  if (caller.role === USER_ROLES.MOD) return {};
  if (caller.role === USER_ROLES.AGENCY) {
    return { agency_workers: { some: { agency_user_id: caller.userId, deleted_at: null } } };
  }
  if (caller.role === USER_ROLES.USER) {
    return { agency_workers: { some: { using_by: caller.userId, deleted_at: null } } };
  }
  return null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetWorkerStatsQuerystring }>,
  reply: FastifyReply,
) {
  try {
    const prisma = request.server.prisma;
    const caller = request.user as { userId: string; role: UserRole };
    const isolation = buildWorkerIsolation(caller);

    if (isolation === null) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const baseWhere = { deleted_at: null, ...isolation };

    const [total, ready, busy, offline, deleted] = await Promise.all([
      prisma.workers.count({ where: baseWhere }),
      prisma.workers.count({ where: { ...baseWhere, status: 'ready' } }),
      prisma.workers.count({ where: { ...baseWhere, status: 'busy' } }),
      prisma.workers.count({ where: { ...baseWhere, status: 'offline' } }),
      prisma.workers.count({ where: { ...isolation, deleted_at: { not: null } } }),
    ]);

    return reply.send({
      success: true,
      data: { total, ready, busy, offline, deleted },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch worker stats',
    });
  }
}
