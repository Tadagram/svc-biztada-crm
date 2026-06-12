import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';

const AI_CONTROLLER_URL =
  process.env.AI_CONTROLLER_URL ?? 'http://svc-ai-controller.tadagram.svc.cluster.local:3100';

const STRATEGY_INTERNAL_TOKEN = process.env.STRATEGY_INTERNAL_TOKEN ?? '';

interface ConsultContext {
  industry?: string;
  business_size?: string;
  current_tools?: string[];
  goal?: string;
}

interface ConsultBody {
  question: string;
  context?: ConsultContext;
}

interface AiControllerResponse {
  session_id?: string;
  advice?: string; // main advice text (markdown)
  plan?: {
    short_term?: string[];
    mid_term?: string[];
    kpis?: string[];
  };
  recommended_actions?: unknown[]; // []StrategyRecommendedAction
  chunks_used?: string[]; // chunk_ids used as context
  model?: string;
  [key: string]: unknown;
}

/**
 * POST /strategy/consult
 *
 * Forwards the user's question to svc-ai-controller RAG pipeline,
 * then logs the session to strategy_session_logs (non-fatal if logging fails).
 *
 * Identity resolution (first match wins):
 *   1. JWT userId          → authenticated user session
 *   2. ?userId query param → authenticated user (legacy)
 *   3. ?guestId query param → guest session (logged with guest_id)
 *   4. None               → anonymous, no logging
 */
export async function consultHandler(
  request: FastifyRequest<{
    Body: ConsultBody;
    Querystring: { userId?: string; guestId?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const { question, context } = request.body;

  const authUser = request.user as { userId?: string } | undefined;
  const userId =
    authUser?.userId ?? request.query.userId ?? (request.headers['x-user-id'] as string) ?? null;
  const guestId = userId ? null : (request.query.guestId ?? null);

  const businessId = (request.headers['x-business-id'] as string) || '';
  const telegramId = (request.headers['x-telegram-id'] as string) || '';

  if (!STRATEGY_INTERNAL_TOKEN) {
    request.log.warn('[strategySession] STRATEGY_INTERNAL_TOKEN not configured');
    return reply.status(503).send({ error: 'Strategy AI service not configured' });
  }

  // ── Call svc-ai-controller ────────────────────────────────────────────────
  let aiResult: AiControllerResponse;
  try {
    const resp = await fetch(`${AI_CONTROLLER_URL}/internal/strategy/consult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Strategy-Token': STRATEGY_INTERNAL_TOKEN,
      },
      body: JSON.stringify({
        user_id: userId ?? '',
        business_id: businessId,
        telegram_id: telegramId,
        question,
        context: context ?? {},
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      request.log.error(
        { status: resp.status, body: errText },
        '[strategySession] ai-controller returned error',
      );
      return reply.status(502).send({ error: 'AI consulting service error' });
    }

    aiResult = (await resp.json()) as AiControllerResponse;
  } catch (err) {
    request.log.error({ err }, '[strategySession] ai-controller unreachable');
    return reply.status(502).send({ error: 'AI consulting service unavailable' });
  }

  // ── Log session (non-fatal) ───────────────────────────────────────────────
  const sessionId = crypto.randomUUID();
  const hasIdentity = !!(userId || guestId);

  if (hasIdentity) {
    try {
      await request.prisma.strategySessionLog.create({
        data: {
          session_id: sessionId,
          user_id: userId ?? null,
          guest_id: guestId ?? null,
          question,
          industry: context?.industry ?? null,
          business_size: context?.business_size ?? null,
          current_tools: context?.current_tools ?? Prisma.JsonNull,
          goal: context?.goal ?? null,
          chunks_used: aiResult.chunks_used ?? Prisma.JsonNull,
          actions_count: Array.isArray(aiResult.recommended_actions)
            ? aiResult.recommended_actions.length
            : 0,
          model: aiResult.model ?? null,
        },
      });
    } catch (logErr) {
      request.log.error({ logErr }, '[strategySession] failed to create session log — non-fatal');
    }
  }

  reply.status(200).send(hasIdentity ? { ...aiResult, session_id: sessionId } : aiResult);
}
