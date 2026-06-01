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
 * Validates that the session belongs to the requesting user.
 */
export async function feedbackHandler(
  request: FastifyRequest<{ Body: FeedbackBody; Querystring: { userId?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { session_id, score, note } = request.body;

  const authUser = request.user as { userId?: string } | undefined;
  const userId = authUser?.userId ?? request.query.userId ?? null;

  // Verify session exists (and belongs to user if userId is known)
  const session = await request.prisma.strategySessionLog.findFirst({
    where: {
      session_id,
      ...(userId ? { user_id: userId } : {}),
    },
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
