import { FastifyReply, FastifyRequest } from 'fastify';

interface GetWithdrawalsQuery {
  status?: 'pending' | 'approved' | 'rejected';
  page?: string;
  limit?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetWithdrawalsQuery }>,
  reply: FastifyReply,
) {
  const { status, page = '1', limit = '50' } = request.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  try {
    const whereClause = status ? { status } : {};

    const [withdrawals, total] = await Promise.all([
      request.prisma.marketplaceWithdrawals.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { phone_number: true, agency_name: true } },
        },
      }),
      request.prisma.marketplaceWithdrawals.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: withdrawals,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({ success: false, message: error.message });
  }
}
