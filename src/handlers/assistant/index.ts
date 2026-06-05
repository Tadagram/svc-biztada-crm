import { FastifyRequest, FastifyReply } from 'fastify';
import { generateAssistantText } from '@services/aiControllerClient';

export async function chatHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { message } = request.body as { message: string };
  const businessId = request.headers['x-business-id'] as string;
  const userId = (request as any).user?.user_id;

  if (!message || typeof message !== 'string' || !message.trim()) {
    reply.status(400).send({ error: 'Message is required' });
    return;
  }

  if (!userId) {
    reply.status(401).send({ error: 'Unauthorized: User ID is required' });
    return;
  }

  try {
    // Pass businessId in context so the AI knows the scope
    const prompt = `[SYSTEM]: Bạn là Trợ lý ảo Biztada phục vụ cho doanh nghiệp (business ID: ${businessId || 'N/A'}). Hãy trả lời câu hỏi của người dùng một cách chuyên nghiệp, ngắn gọn và hữu ích. Có thể sử dụng bảng biểu, danh sách nếu thích hợp.\n\n[USER]: ${message}`;
    const replyText = await generateAssistantText(prompt, userId);

    reply.status(200).send({
      reply: replyText,
      toolActions: [],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Chat failed';
    request.log.error({ err }, '[assistant] chatHandler failed');
    reply.status(500).send({ message: errorMsg });
  }
}

export async function historyHandler(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    reply.status(200).send({ messages: [] });
  } catch (err) {
    reply.status(500).send({ error: 'Failed to fetch history' });
  }
}
