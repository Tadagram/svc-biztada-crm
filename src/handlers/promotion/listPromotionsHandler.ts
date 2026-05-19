import { FastifyRequest, FastifyReply } from 'fastify';

interface ListPromotionsQuery {
  status?: string;
  limit?: string;
  offset?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListPromotionsQuery }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { status, limit = '20', offset = '0' } = request.query;

  const limitNum = Math.min(Number(limit) || 20, 100);
  const offsetNum = Number(offset) || 0;

  const where = status ? { status: status as any } : {};

  const [promotions, total] = await Promise.all([
    prisma.promotions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limitNum,
      skip: offsetNum,
      include: {
        creator: { select: { user_id: true, phone_number: true, agency_name: true } },
        executor: { select: { user_id: true, phone_number: true, agency_name: true } },
        _count: { select: { user_targets: true, execution_logs: true } },
      },
    }),
    prisma.promotions.count({ where }),
  ]);

  return reply.send({
    data: promotions,
    total,
    limit: limitNum,
    offset: offsetNum,
  });
}
