import { FastifyRequest, FastifyReply } from 'fastify';
import { generateText } from '@services/aiControllerClient';

/**
 * POST /strategy/ai
 *
 * Accepts a raw text prompt (Content-Type: text/plain) from the strategy app
 * and returns the AI-generated text response (also text/plain).
 *
 * The prompt is forwarded unchanged — callers (e.g. interviewAiService) are
 * responsible for building complete, self-contained prompts including any
 * system context and output-format instructions.
 *
 * This endpoint is intentionally unauthenticated so that guest users on
 * strategy.biztada.com can call it without a session JWT.
 * Authentication to svc-ai-controller is handled internally via Worker JWT.
 */
export async function generateAiTextHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userPrompt = request.body as string;

  if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
    reply.status(400).send({ error: 'Prompt is required (text/plain body)' });
    return;
  }

  try {
    const result = await generateText(userPrompt.trim());
    reply.status(200).header('Content-Type', 'text/plain; charset=utf-8').send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed';
    request.log.error({ err }, '[strategyAi] generateText failed');
    reply.status(502).send({ error: message });
  }
}
