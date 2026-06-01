import { FastifyRequest, FastifyReply } from 'fastify';

interface HistoryQuerystring {
  userId?: string;
  page?: string;
  limit?: string;
}

/**
 * GET /strategy/session-history
 *
 * Returns a paginated list of the user's past consult sessions.
 * Requires userId from JWT or query param.
 */
export async function historyHandler(
  request: FastifyRequest<{ Querystring: HistoryQuerystring }>,
  reply: FastifyReply,
): Promise<void> {
  const authUser = request.user as { userId?: string } | undefined;
  const userId = authUser?.userId ?? request.query.userId ?? null;

  if (!userId) {
    return reply.status(401).send({ error: 'userId is required' });
  }

  const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(request.query.limit ?? '10', 10) || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    request.prisma.strategySessionLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      select: {
        session_id: true,
        question: true,
        industry: true,
        business_size: true,
        goal: true,
        actions_count: true,
        model: true,
        feedback_score: true,
        feedback_note: true,
        created_at: true,
      },
    }),
    request.prisma.strategySessionLog.count({ where: { user_id: userId } }),
  ]);

  reply.status(200).send({ items, total, page, limit });
}
