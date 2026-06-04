import { FastifyReply, FastifyRequest } from 'fastify';

interface GetTradesQuery {
  status?: 'escrow' | 'completed' | 'refunded' | 'disputed';
  page?: string;
  limit?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetTradesQuery }>,
  reply: FastifyReply,
) {
  const { status, page = '1', limit = '50' } = request.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  try {
    const whereClause = status ? { status } : {};

    const [trades, total] = await Promise.all([
      request.prisma.marketplaceTrades.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          listing: { select: { title: true } },
          buyer: { select: { phone_number: true } },
          seller: { select: { phone_number: true } },
        },
      }),
      request.prisma.marketplaceTrades.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: trades,
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
