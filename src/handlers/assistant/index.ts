import { FastifyRequest, FastifyReply } from 'fastify';
import { generateAssistantText } from '@services/aiControllerClient';
import {
  getMarketingDashboard,
  getWorkerStats,
  getActiveWorkflows,
  getDashboardActivity,
} from '@services/businessMarketingClient';

export async function chatHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { message } = request.body as { message: string };
  const businessId = request.headers['x-business-id'] as string;
  const userId = (request as any).user?.user_id;
  const authHeader = request.headers.authorization;

  if (!message || typeof message !== 'string' || !message.trim()) {
    reply.status(400).send({ error: 'Message is required' });
    return;
  }

  if (!userId) {
    reply.status(401).send({ error: 'Unauthorized: User ID is required' });
    return;
  }

  try {
    const systemPrompt = `[SYSTEM]: Bạn là Trợ lý ảo Biztada chuyên nghiệp phục vụ cho doanh nghiệp (business ID: ${businessId || 'N/A'}).
Bạn có khả năng tự động lấy dữ liệu thời gian thực từ các công cụ Marketing của user bằng cách gọi (call) các Tool.

Danh sách các Tools bạn có thể gọi (NẾU CẦN THIẾT):
1. "get_marketing_dashboard": Lấy dữ liệu tổng quan về các chiến dịch seeding, thống kê tài khoản hôm nay.
2. "get_worker_stats": Lấy trạng thái hoạt động của các worker (đang chạy, lỗi, tổng số task đã xử lý).
3. "get_active_workflows": Lấy danh sách các workflow đang hoạt động của doanh nghiệp.
4. "get_dashboard_activity": Lấy báo cáo hoạt động chạy seeding theo kỳ (ngày/tuần/tháng).

CÁCH GỌI TOOL:
Nếu bạn cần dữ liệu từ hệ thống để trả lời, HÃY TRẢ VỀ DUY NHẤT một khối JSON chứa lời gọi Tool. KHÔNG viết thêm bất kỳ chữ nào khác.
Định dạng JSON:
\`\`\`json
{
  "TOOL_CALL": "tên_tool_ở_trên"
}
\`\`\`

Sau khi bạn trả về JSON này, hệ thống sẽ thực thi và gửi lại cho bạn kết quả (dưới dạng [TOOL_RESULT]) để bạn đọc và trả lời người dùng.
NẾU KHÔNG CẦN DÙNG TOOL (hoặc đã có đủ thông tin), hãy trả lời trực tiếp cho người dùng một cách chuyên nghiệp, ngắn gọn và hữu ích.`;

    let currentPrompt = `${systemPrompt}\n\n[USER]: ${message}`;
    let replyText = '';
    const toolActions: string[] = [];

    // Vòng lặp ReAct (tối đa 3 nhịp)
    const MAX_STEPS = 3;
    for (let step = 0; step < MAX_STEPS; step++) {
      replyText = await generateAssistantText(currentPrompt, userId);

      const toolMatch = replyText.match(/```json\s*(\{[\s\S]*?"TOOL_CALL"[\s\S]*?\})\s*```/);
      if (toolMatch) {
        try {
          const toolData = JSON.parse(toolMatch[1]);
          const toolName = toolData.TOOL_CALL;
          toolActions.push(toolName);
          request.log.info({ toolName }, '[assistant] executing tool');

          let toolResult: any = null;
          if (!authHeader) {
            toolResult = { error: 'Missing authorization token to call tools.' };
          } else {
            if (toolName === 'get_marketing_dashboard') {
              toolResult = await getMarketingDashboard(authHeader);
            } else if (toolName === 'get_worker_stats') {
              toolResult = await getWorkerStats(authHeader);
            } else if (toolName === 'get_active_workflows') {
              toolResult = await getActiveWorkflows(authHeader);
            } else if (toolName === 'get_dashboard_activity') {
              toolResult = await getDashboardActivity(authHeader);
            } else {
              toolResult = { error: 'Tool not found' };
            }
          }

          currentPrompt += `\n\n[ASSISTANT_TOOL_CALL]: ${toolMatch[0]}\n[TOOL_RESULT]: ${JSON.stringify(toolResult)}\n[SYSTEM]: Dựa vào kết quả trên, hãy đưa ra câu trả lời cuối cùng cho người dùng (KHÔNG trả về TOOL_CALL nữa trừ khi thực sự cần thiết).`;
          continue; // Chạy tiếp vòng lặp để AI trả lời
        } catch (e) {
          request.log.error({ err: e }, '[assistant] tool execution failed');
          currentPrompt += `\n\n[TOOL_RESULT]: {"error": "Lỗi khi gọi tool hoặc parse JSON"}\n[SYSTEM]: Hãy thông báo lỗi này cho người dùng một cách lịch sự.`;
          continue;
        }
      } else {
        // Không có Tool Call -> AI đã trả lời xong
        break;
      }
    }

    reply.status(200).send({
      reply: replyText,
      toolActions,
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
