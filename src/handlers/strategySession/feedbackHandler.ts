import { FastifyRequest, FastifyReply } from 'fastify';

interface FeedbackBody {
  session_id: string;
  score: number;
  note?: string;
}

/**
 * POST /strategy/feedback
 *
 * Saves a feedback score (1–5) and optional note for a consult session.
 * Validates that the session belongs to the requesting user OR guest.
 * Identity: JWT userId > ?userId > ?guestId.
 */
export async function feedbackHandler(
  request: FastifyRequest<{
    Body: FeedbackBody;
    Querystring: { userId?: string; guestId?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const { session_id, score, note } = request.body;

  const authUser = request.user as { userId?: string } | undefined;
  const userId = authUser?.userId ?? request.query.userId ?? null;
  const guestId = userId ? null : (request.query.guestId ?? null);

  // Build ownership filter: verify session belongs to this identity
  const ownerFilter = userId
    ? { session_id, user_id: userId }
    : guestId
      ? { session_id, guest_id: guestId }
      : null;

  if (!ownerFilter) {
    return reply.status(401).send({ error: 'userId or guestId is required' });
  }

  const session = await request.prisma.strategySessionLog.findFirst({
    where: ownerFilter,
    select: { session_id: true },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  await request.prisma.strategySessionLog.update({
    where: { session_id },
    data: {
      feedback_score: score,
      feedback_note: note ?? null,
    },
  });

  reply.status(200).send({ ok: true });
}

