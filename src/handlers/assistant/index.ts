import { FastifyRequest, FastifyReply } from 'fastify';
import { generateAssistantText } from '@services/aiControllerClient';
import {
  getMarketingDashboard,
  getWorkerStats,
  getActiveWorkflows,
  getDashboardActivity,
} from '@services/apiDispatcherClient';
import { mcpServer } from '../../mcp/server';

export async function chatHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { message } = request.body as { message: string };
  const businessId = request.headers['x-business-id'] as string | undefined;
  const userId = (request as any).user?.user_id;
  const authHeader = request.headers.authorization;
  const prisma = request.server.prisma;

  if (!message || typeof message !== 'string' || !message.trim()) {
    reply.status(400).send({ error: 'Message is required' });
    return;
  }

  if (!userId) {
    reply.status(401).send({ error: 'Unauthorized: User ID is required' });
    return;
  }

  try {
    // 1. Fetch User Memory (Preferences)
    const memory = await prisma.userAssistantMemory.findUnique({ where: { user_id: userId } });
    const userPreferences = memory?.preferences
      ? JSON.stringify(memory.preferences)
      : 'Chưa có thông tin.';

    // 2. Fetch Recent Chat History (Last 10 messages)
    const recentMessages = await prisma.assistantMessage.findMany({
      where: { user_id: userId, business_id: businessId || null },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
    const historyText = recentMessages
      .reverse()
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n');

    const systemPrompt = `[SYSTEM]: Bạn là **Enterprise Solutions Architect (Giám đốc Vận hành & Giải pháp)** của hệ sinh thái Biztada (business ID: ${businessId || 'N/A'}).
Thông tin ghi nhớ về người dùng này: ${userPreferences}
SỨ MỆNH: Khi người dùng đưa ra một mục tiêu kinh doanh (VD: Xây kênh tự động, Tăng doanh số, Chăm sóc khách hàng), TUYỆT ĐỐI KHÔNG làm ngay một bước đơn lẻ. Bạn PHẢI dùng tư duy Kiến trúc sư để phân tích và đề xuất một Quy trình Tự động hóa (Workflow Pipeline) kết hợp nhiều công cụ của Biztada.
QUY TRÌNH BẮT BUỘC KHI TƯ VẤN GIẢI PHÁP:
1. Gọi tool "mcp_call_tool" với name là "get_business_playbooks" để lấy danh sách các cẩm nang (Templates) thực tế của Biztada.
2. Dựa vào Cẩm nang đó, vẽ ra lộ trình các bước (Ví dụ: Bước 1 tạo nhân vật ở BrandLabs, Bước 2 dùng Marketing Workflow để cào TikTok -> Remake AI -> Đăng Facebook).
3. ĐỐI VỚI MARKETING WORKFLOW: BẠN KHÔNG ĐƯỢC ĐOÁN MÒ THAM SỐ. BẮT BUỘC phải gọi tool "marketing_get_nodes_schema" để xem chính xác các Nodes yêu cầu điền tham số (config fields) gì. Căn cứ vào schema đó để hỏi người dùng điền đủ thông tin (như link TikTok, Account ID).
4. Hỏi ý kiến người dùng xem họ có đồng ý với Lộ trình và cung cấp đủ tham số chưa.
5. CHỈ KHI người dùng đồng ý và đủ tham số, bạn mới lần lượt tự động gọi các tool MCP tương ứng với JSON Payload CỰC KỲ CHÍNH XÁC để setup toàn bộ hệ thống cho họ.

Bạn có khả năng trả về văn bản dùng Markdown. CÓ THỂ sử dụng Table, Danh sách (List) hoặc in đậm.
ĐẶC BIỆT: Nếu muốn hiển thị Biểu đồ (Chart), hãy trả về một code block dạng JSON với type="chart". Ví dụ:
\`\`\`json
{ "type": "chart", "chartType": "bar", "data": [ {"name": "A", "value": 10} ] }
\`\`\`

Bạn có thể tự động lấy dữ liệu thời gian thực từ các công cụ Marketing của user bằng cách gọi (call) các Tool.
Danh sách các Tools bạn có thể gọi:
1. "get_marketing_dashboard": Lấy dữ liệu tổng quan
2. "get_worker_stats": Lấy trạng thái hoạt động của worker
3. "get_active_workflows": Lấy danh sách workflow
4. "get_dashboard_activity": Lấy báo cáo hoạt động chạy seeding
5. "update_user_memory": Gọi tool này với tham số để CẬP NHẬT GHI NHỚ nếu người dùng yêu cầu bạn thay đổi cách trả lời.
6. "mcp_call_tool": THỰC THI MỌI API KHÁC trong hệ thống của người dùng (bao gồm lấy Playbooks, Marketing, BrandLabs, Chatbot) theo giao thức MCP.

[MCP TOOLS LIST (Dành cho mcp_call_tool)]
${JSON.stringify(mcpServer.getTools(), null, 2)}

CÁCH GỌI TOOL:
Trả về DUY NHẤT một khối JSON.
\`\`\`json
{
  "TOOL_CALL": "mcp_call_tool",
  "TOOL_ARGS": { "name": "marketing_create_account", "arguments": { "platform": "facebook", "account_name": "My Page" } }
}
\`\`\`
Nếu không cần dùng tool, trả lời trực tiếp cho người dùng.

[LỊCH SỬ GẦN ĐÂY]
${historyText}`;

    let currentPrompt = `${systemPrompt}\n\n[USER]: ${message}`;
    let replyText = '';
    const toolActions: string[] = [];

    // Save User message
    await prisma.assistantMessage.create({
      data: {
        user_id: userId,
        business_id: businessId || null,
        role: 'user',
        content: message,
      },
    });

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
          if (toolName === 'update_user_memory') {
            // Handle memory update
            const prefs = toolData.TOOL_ARGS || {};
            await prisma.userAssistantMemory.upsert({
              where: { user_id: userId },
              update: { preferences: prefs },
              create: { user_id: userId, preferences: prefs },
            });
            toolResult = { success: true, message: 'Memory updated successfully.' };
          } else if (!authHeader) {
            toolResult = { error: 'Missing authorization token to call tools.' };
          } else {
            if (toolName === 'get_marketing_dashboard')
              toolResult = await getMarketingDashboard(authHeader);
            else if (toolName === 'get_worker_stats') toolResult = await getWorkerStats(authHeader);
            else if (toolName === 'get_active_workflows')
              toolResult = await getActiveWorkflows(authHeader);
            else if (toolName === 'get_dashboard_activity')
              toolResult = await getDashboardActivity(authHeader);
            else if (toolName === 'mcp_call_tool') {
              const name = toolData.TOOL_ARGS?.name;
              const args = toolData.TOOL_ARGS?.arguments || {};
              if (!name) {
                toolResult = { error: 'Missing tool name for mcp_call_tool' };
              } else {
                toolResult = await mcpServer.callTool(
                  authHeader,
                  { name, arguments: args },
                  prisma,
                );
              }
            } else toolResult = { error: 'Tool not found' };
          }

          currentPrompt += `\n\n[ASSISTANT_TOOL_CALL]: ${toolMatch[0]}\n[TOOL_RESULT]: ${JSON.stringify(toolResult)}\n[SYSTEM]: Tiếp tục đưa ra câu trả lời cuối cùng cho người dùng.`;
          continue;
        } catch (e) {
          currentPrompt += `\n\n[TOOL_RESULT]: {"error": "Lỗi khi gọi tool"}\n[SYSTEM]: Hãy thông báo lỗi này cho người dùng.`;
          continue;
        }
      } else {
        break;
      }
    }

    // Save Assistant message
    await prisma.assistantMessage.create({
      data: {
        user_id: userId,
        business_id: businessId || null,
        role: 'assistant',
        content: replyText,
        tool_actions: toolActions.length ? toolActions : undefined,
      },
    });

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

export async function historyHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = (request as any).user?.user_id;
  const businessId = request.headers['x-business-id'] as string | undefined;
  const prisma = request.server.prisma;

  if (!userId) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }

  try {
    const messages = await prisma.assistantMessage.findMany({
      where: { user_id: userId, business_id: businessId || null },
      orderBy: { created_at: 'asc' },
    });

    reply.status(200).send({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        toolActions: m.tool_actions || [],
      })),
    });
  } catch (err) {
    request.log.error({ err }, '[assistant] historyHandler failed');
    reply.status(500).send({ error: 'Failed to fetch history' });
  }
}
