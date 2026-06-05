import { FastifyRequest, FastifyReply } from 'fastify';

const AI_CONTROLLER_URL = process.env.AI_CONTROLLER_URL ?? 'http://svc-ai-controller.tadagram.svc.cluster.local:3100';
const STRATEGY_INTERNAL_TOKEN = process.env.STRATEGY_INTERNAL_TOKEN ?? '';

export async function chatHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { message } = request.body as { message: string };
  const businessId = request.headers['x-business-id'] as string;

  if (!message || typeof message !== 'string' || !message.trim()) {
    reply.status(400).send({ error: 'Message is required' });
    return;
  }

  try {
    const resp = await fetch(`${AI_CONTROLLER_URL}/internal/strategy/consult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Strategy-Token': STRATEGY_INTERNAL_TOKEN,
      },
      body: JSON.stringify({ 
        question: message, 
        context: {
          description: `Managing business ID ${businessId}`
        } 
      }),
    });

    if (!resp.ok) {
      throw new Error(`AI controller returned ${resp.status}`);
    }

    const aiResult = await resp.json() as any;
    
    // Parse actions out for the frontend
    const toolActions = (aiResult.recommended_actions || []).map((action: any) => action.title);

    reply.status(200).send({ 
      reply: aiResult.advice || 'Xin lỗi, tôi không thể xử lý lúc này.',
      toolActions: toolActions
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Chat failed';
    request.log.error({ err }, '[assistant] chatHandler failed');
    reply.status(500).send({ message: errorMsg });
  }
}

export async function historyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    reply.status(200).send({ messages: [] });
  } catch (err) {
    reply.status(500).send({ error: 'Failed to fetch history' });
  }
}
