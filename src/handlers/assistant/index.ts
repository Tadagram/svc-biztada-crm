import { FastifyRequest, FastifyReply } from 'fastify';
import { generatePrivateText } from '@services/aiControllerClient';

export async function chatHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
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
    const prompt = `[SYSTEM]: Bạn là Trợ lý ảo Biztada, chạy cục bộ trên thiết bị của người dùng (business: ${businessId}). Hãy trả lời câu hỏi của người dùng một cách chuyên nghiệp, ngắn gọn và hữu ích. Có thể sử dụng bảng biểu, danh sách nếu thích hợp.\n\n[USER]: ${message}`;
    const replyText = await generatePrivateText(prompt, userId);

    reply.status(200).send({ 
      reply: replyText,
      toolActions: []
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Chat failed';
    request.log.error({ err }, '[assistant] chatHandler failed');
    reply.status(500).send({ message: errorMsg });
  }
}

export async function historyHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    reply.status(200).send({ messages: [] });
  } catch (err) {
    reply.status(500).send({ error: 'Failed to fetch history' });
  }
}
