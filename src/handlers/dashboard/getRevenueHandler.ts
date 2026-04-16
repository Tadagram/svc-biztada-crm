import { FastifyRequest, FastifyReply } from 'fastify';
import { Prisma, TopUpStatus, UserRole } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface RevenueQuery {
  days?: string;
}

interface IRevenuePoint {
  date: string;
  revenue: number;
  count: number;
}

export async function handler(
  request: FastifyRequest<{ Querystring: RevenueQuery }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { days = '30' } = request.query;
  const numDays = Math.min(Math.max(parseInt(days) || 30, 1), 365);
  const caller = request.user as { userId: string; role: UserRole | null };

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - numDays);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  // Build role-isolated where clause
  const where: Prisma.TopUpRequestsWhereInput = {
    status: TopUpStatus.APPROVED,
    reviewed_at: { gte: startDate, lte: endDate },
  };

  // MOD + admin (null role) see all; AGENCY sees sub-users'; USER sees own
  if (caller.role !== null && caller.role !== USER_ROLES.MOD) {
    if (caller.role === USER_ROLES.AGENCY) {
      where.user = { parent_user_id: caller.userId };
    } else {
      where.user_id = caller.userId;
    }
  }

  const approvedTopUps = await prisma.topUpRequests.findMany({
    where,
    select: {
      amount: true,
      reviewed_at: true,
    },
  });

  const revenueByDate = new Map<string, { total: number; count: number }>();

  approvedTopUps.forEach((topup) => {
    if (!topup.reviewed_at) return;
    const dateKey = topup.reviewed_at.toISOString().split('T')[0];
    const current = revenueByDate.get(dateKey) || { total: 0, count: 0 };
    revenueByDate.set(dateKey, {
      total: current.total + Number(topup.amount),
      count: current.count + 1,
    });
  });

  const chartData: IRevenuePoint[] = [];
  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    const data = revenueByDate.get(dateKey) || { total: 0, count: 0 };
    chartData.push({
      date: dateKey,
      revenue: data.total,
      count: data.count,
    });
  }

  const totalRevenue = approvedTopUps.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgDaily = totalRevenue / numDays;

  return reply.send({
    success: true,
    data: {
      totalRevenue,
      totalTransactions: approvedTopUps.length,
      avgDaily,
      period: numDays,
      chartData,
    },
  });
}
