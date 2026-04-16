import { FastifyRequest, FastifyReply } from 'fastify';
import { TopUpStatus } from '@prisma/client';

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

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - numDays);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const approvedTopUps = await prisma.topUpRequests.findMany({
    where: {
      status: TopUpStatus.APPROVED,
      reviewed_at: {
        gte: startDate,
        lte: endDate,
      },
    },
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
