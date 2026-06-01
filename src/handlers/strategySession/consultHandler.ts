import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

const AI_CONTROLLER_URL =
  process.env.AI_CONTROLLER_URL ??
  'http://svc-ai-controller.tadagram.svc.cluster.local:3100';

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
  answer?: string;
  action_plan?: {
    actions?: unknown[];
  };
  chunks_used?: unknown;
  model?: string;
  [key: string]: unknown;
}

/**
 * POST /strategy/consult
 *
 * Forwards the user's question to svc-ai-controller RAG pipeline,
 * then logs the session to strategy_session_logs (non-fatal if logging fails).
 * Works with or without a user JWT — userId falls back to query param.
 */
export async function consultHandler(
  request: FastifyRequest<{ Body: ConsultBody; Querystring: { userId?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { question, context } = request.body;

  const authUser = request.user as { userId?: string } | undefined;
  const userId = authUser?.userId ?? request.query.userId ?? null;

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
      body: JSON.stringify({ question, context: context ?? {} }),
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
  if (userId) {
    try {
      await request.prisma.strategySessionLog.create({
        data: {
          session_id: sessionId,
          user_id: userId,
          question,
          industry: context?.industry ?? null,
          business_size: context?.business_size ?? null,
          current_tools: context?.current_tools ? JSON.stringify(context.current_tools) : null,
          goal: context?.goal ?? null,
          chunks_used: aiResult.chunks_used ? JSON.stringify(aiResult.chunks_used) : null,
          actions_count: Array.isArray(aiResult.action_plan?.actions)
            ? aiResult.action_plan!.actions!.length
            : 0,
          model: aiResult.model ?? null,
        },
      });
    } catch (logErr) {
      request.log.error({ logErr }, '[strategySession] failed to create session log — non-fatal');
    }
  }

  reply.status(200).send({ ...aiResult, session_id: userId ? sessionId : undefined });
}
