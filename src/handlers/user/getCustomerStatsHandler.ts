import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const prisma = request.server.prisma;
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    const baseWhere = { role: UserRole.user, deleted_at: null };

    const [total, active, newCount, dormant] = await Promise.all([
      prisma.users.count({ where: baseWhere }),
      prisma.users.count({
        where: {
          ...baseWhere,
          status: 'active',
          last_active_at: { not: null, gte: fourteenDaysAgo },
        },
      }),
      prisma.users.count({
        where: {
          ...baseWhere,
          status: 'active',
          last_active_at: null,
          created_at: { gte: sevenDaysAgo },
        },
      }),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::bigint as count FROM users
         WHERE role = 'user' AND deleted_at IS NULL AND status = 'active'
         AND (
           (last_active_at IS NOT NULL AND last_active_at < $1)
           OR (last_active_at IS NULL AND created_at < $2)
         )`,
        fourteenDaysAgo,
        sevenDaysAgo,
      ),
    ]);

    return reply.send({
      success: true,
      data: {
        total,
        active,
        new: newCount,
        dormant: Number(dormant[0]?.count ?? 0),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch customer stats',
    });
  }
}
