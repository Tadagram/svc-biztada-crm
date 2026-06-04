import { FastifyReply, FastifyRequest } from 'fastify';

interface GetListingsQuery {
  status?: 'pending' | 'active' | 'rejected' | 'suspended';
  page?: string;
  limit?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetListingsQuery }>,
  reply: FastifyReply,
) {
  const { status, page = '1', limit = '50' } = request.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  try {
    const whereClause = status ? { status } : {};

    const [listings, total] = await Promise.all([
      request.prisma.marketplaceListings.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          seller: {
            select: { phone_number: true, agency_name: true },
          },
        },
      }),
      request.prisma.marketplaceListings.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: listings,
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
