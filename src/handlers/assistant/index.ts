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
  const userId = (request as any).user?.userId || (request as any).user?.user_id;
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

  // Setup SSE
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendSSE = (event: string, data: any) => {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Keep connection alive to prevent Cloudflare timeout
  const keepAliveInterval = setInterval(() => {
    reply.raw.write(`:\n\n`);
  }, 15000);

  sendSSE('ping', { status: 'connected' });

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
3. ĐỐI VỚI CÁC MCP TOOL: BẠN PHẢI TUÂN THỦ TẠO JSON PAYLOAD DỰA TRÊN ĐẶC TẢ SCHEMA CỦA CÔNG CỤ (Ví dụ: Nodes của workflow hay Steps của chatbot). TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ BỊA (Hallucinate) CÁC TRƯỜNG HAY CÁC LOẠI NODE KHÔNG CÓ TRONG SCHEMA.
4. Hỏi ý kiến người dùng xem họ có đồng ý với Lộ trình và cung cấp đủ tham số (như link nguồn, ID tài khoản) chưa.
5. CHỈ KHI người dùng đồng ý và đủ tham số, bạn mới tạo ra Payload JSON CỰC KỲ CHÍNH XÁC để setup hệ thống.

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
${JSON.stringify(await mcpServer.getTools(authHeader), null, 2)}

CÁCH GỌI TOOL NGẦM (BACKGROUND EXECUTION):
Nếu bạn CẦN TRUY VẤN DỮ LIỆU (ví dụ lấy danh sách Playbook), BẠN BẮT BUỘC TRẢ VỀ DUY NHẤT một khối JSON như sau:
\`\`\`json
{
  "TOOL_CALL": "mcp_call_tool",
  "TOOL_ARGS": { "name": "get_business_playbooks", "arguments": {} }
}
\`\`\`

CÁCH TRẢ VỀ CẤU HÌNH (FRONTEND EXECUTION PAYLOAD):
Nếu bạn ĐÃ TRUY VẤN XONG hoặc KHÔNG CẦN TRUY VẤN, BẠN BẮT BUỘC PHẢI TRẢ VỀ TOÀN BỘ CÂU TRẢ LỜI DƯỚI DẠNG MỘT KHỐI JSON DUY NHẤT. TUYỆT ĐỐI KHÔNG XUẤT RA BẤT KỲ VĂN BẢN NÀO BÊN NGOÀI KHỐI JSON NÀY.
Cấu trúc JSON bắt buộc:
\`\`\`json
{
  "reply": "Văn bản giải thích cho người dùng đọc (Dùng Markdown, KHÔNG chứa code block JSON Payload)",
  "actionPayloads": [
    { "Tên cấu hình/Payload API dựa trên Schema": "..." }
  ]
}
\`\`\`
Trường "actionPayloads" là một mảng các object. Nếu không có payload nào, hãy để mảng rỗng []. Khối JSON này KHÔNG CHỨA "TOOL_CALL" mà chứa thẳng Payload API.

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
      sendSSE('progress', { message: `AI đang phân tích (Step ${step + 1}/${MAX_STEPS})...` });
      replyText = await generateAssistantText(currentPrompt, userId);

      let parsedToolCall: any = null;
      let rawToolMatch = '';

      // Extract JSON intelligently
      const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
      const match = replyText.match(jsonRegex);
      let jsonString = replyText;
      if (match && match[1]) {
        jsonString = match[1];
        rawToolMatch = match[0];
      } else {
        // Find the first { and last }
        const startIdx = replyText.indexOf('{');
        const endIdx = replyText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonString = replyText.substring(startIdx, endIdx + 1);
          rawToolMatch = jsonString;
        }
      }

      try {
        const parsedData = JSON.parse(jsonString);
        if (parsedData.TOOL_CALL) {
          parsedToolCall = parsedData;
        }
      } catch (e) {
        // Not a valid JSON or doesn't have TOOL_CALL
      }

      if (parsedToolCall) {
        try {
          const toolName = parsedToolCall.TOOL_CALL;
          toolActions.push(toolName);
          request.log.info({ toolName }, '[assistant] executing tool');
          sendSSE('tool_call', { name: toolName, message: `Hệ thống đang truy xuất dữ liệu: ${toolName}...` });

          let toolResult: any = null;
          if (toolName === 'update_user_memory') {
            // Handle memory update
            const prefs = parsedToolCall.TOOL_ARGS || {};
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
              const name = parsedToolCall.TOOL_ARGS?.name;
              const args = parsedToolCall.TOOL_ARGS?.arguments || {};
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

          currentPrompt += `\n\n[ASSISTANT_TOOL_CALL]: ${rawToolMatch}\n[TOOL_RESULT]: ${JSON.stringify(toolResult)}\n[SYSTEM]: Tiếp tục đưa ra câu trả lời cuối cùng cho người dùng.`;
          continue;
        } catch (e) {
          currentPrompt += `\n\n[TOOL_RESULT]: {"error": "Lỗi khi gọi tool"}\n[SYSTEM]: Hãy thông báo lỗi này cho người dùng.`;
          continue;
        }
      } else {
        break;
      }
    }

    let finalReply = replyText;
    let actionPayloads: any[] = [];

    // Attempt to parse the structured JSON response
    try {
      // Find the JSON block if the LLM wrapped it in markdown code block
      const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
      const match = replyText.match(jsonRegex);

      let jsonString = replyText;
      if (match && match[1]) {
        jsonString = match[1];
      } else {
        const startIdx = replyText.indexOf('{');
        const endIdx = replyText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonString = replyText.substring(startIdx, endIdx + 1);
        }
      }

      const parsed = JSON.parse(jsonString);
      if (parsed.reply) {
        finalReply = parsed.reply;
      }
      if (parsed.actionPayloads && Array.isArray(parsed.actionPayloads)) {
        actionPayloads = parsed.actionPayloads;
      }
    } catch (e) {
      // Fallback: If AI fails to return structured JSON, we just use the raw text as reply
      request.log.warn('Failed to parse structured AI output. Using raw text.');
    }

    // Save Assistant message
    await prisma.assistantMessage.create({
      data: {
        user_id: userId,
        business_id: businessId || null,
        role: 'assistant',
        content: finalReply,
        tool_actions: actionPayloads.length
          ? actionPayloads
          : toolActions.length
            ? toolActions
            : undefined,
      },
    });

    clearInterval(keepAliveInterval);
    sendSSE('completed', {
      reply: finalReply,
      actionPayloads,
      toolActions,
    });
    reply.raw.end();
  } catch (err) {
    request.log.error(err);
    clearInterval(keepAliveInterval);
    sendSSE('error', { error: 'Internal Server Error' });
    reply.raw.end();
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
