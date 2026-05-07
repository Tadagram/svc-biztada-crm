import { FastifyRequest, FastifyReply } from 'fastify';
import { ServicePackagePurchaseStatus, UserRole } from '@prisma/client';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const prisma = request.server.prisma;
    const caller = request.user as {
      userId: string;
      role: UserRole | null;
    };
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    const isAdminOrMod = caller.role === null || caller.role === UserRole.mod;
    const isAgency = caller.role === UserRole.agency;

    if (!isAdminOrMod && !isAgency && caller.role !== UserRole.user) {
      return reply.status(403).send({ success: false, message: 'Forbidden' });
    }

    const purchasedUserRows = await prisma.servicePackagePurchases.findMany({
      where: {
        status: ServicePackagePurchaseStatus.completed,
        ...(isAgency ? { seller_user_id: caller.userId } : {}),
        ...(caller.role === UserRole.user ? { user_id: caller.userId } : {}),
      },
      select: {
        user_id: true,
      },
      distinct: ['user_id'],
    });

    const purchasedUserIds = purchasedUserRows.map((row) => row.user_id);

    if (purchasedUserIds.length === 0) {
      return reply.send({
        success: true,
        data: {
          total: 0,
          active: 0,
          new: 0,
          dormant: 0,
        },
      });
    }

    const baseWhere = {
      deleted_at: null,
      user_id: {
        in: purchasedUserIds,
      },
    };

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
      // Dormant: active users who haven't interacted recently
      // (last_active_at < 14d ago) OR (never active + created > 7d ago)
      prisma.users.count({
        where: {
          ...baseWhere,
          status: 'active',
          OR: [
            { last_active_at: { not: null, lt: fourteenDaysAgo } },
            { last_active_at: null, created_at: { lt: sevenDaysAgo } },
          ],
        },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        total,
        active,
        new: newCount,
        dormant,
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
