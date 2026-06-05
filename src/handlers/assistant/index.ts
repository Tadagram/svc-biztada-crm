import { FastifyRequest, FastifyReply } from 'fastify';
import { generateText } from '@services/aiControllerClient';

// Normally we would use Prisma here:
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

export async function chatHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { message } = request.body as { message: string };
  const businessId = request.headers['x-business-id'] as string;
  const user = (request as any).user; // from Auth middleware

  if (!message || typeof message !== 'string' || !message.trim()) {
    reply.status(400).send({ error: 'Message is required' });
    return;
  }

  try {
    // 1. Get or create active AiAssistantSession for this user + business
    // 2. Save user message to AiAssistantMessages
    // For now, we simulate this as Prisma client is not fully generated
    
    // 3. Build prompt with context
    const prompt = `[SYSTEM]: You are Biztada Virtual Assistant. User wants to manage their business ID ${businessId}.\n\n[USER]: ${message}`;

    // 4. Send task to svc-ai-controller
    const result = await generateText(prompt);

    // 5. Save assistant reply to AiAssistantMessages
    
    reply.status(200).send({ 
      reply: result,
      toolActions: [] // Extract tool actions if any from result
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
  const businessId = request.headers['x-business-id'] as string;
  const user = (request as any).user;

  try {
    // 1. Query AiAssistantMessages for active session
    // Returning empty array for now since Prisma is not fully updated
    reply.status(200).send({ messages: [] });
  } catch (err) {
    request.log.error({ err }, '[assistant] historyHandler failed');
    reply.status(500).send({ error: 'Failed to fetch history' });
  }
}
