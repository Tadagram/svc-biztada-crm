import { FastifyRequest, FastifyReply } from 'fastify';
import { generateAssistantText } from '@services/aiControllerClient';
import {
  getMarketingDashboard,
  getWorkerStats,
  getActiveWorkflows,
  getDashboardActivity,
} from '@services/apiDispatcherClient';
import { mcpServer } from '../../mcp/server';

const AI_CONTROLLER_URL =
  process.env.AI_CONTROLLER_URL ?? 'http://svc-ai-controller.tadagram.svc.cluster.local:3100';
const STRATEGY_INTERNAL_TOKEN = process.env.STRATEGY_INTERNAL_TOKEN ?? '';

export async function chatHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { message } = request.body as { message: string };
  const businessId = request.headers['x-business-id'] as string | undefined;

  // Auth resolution
  const userPayload = request.user as any;
  const userId = userPayload?.userId || userPayload?.user_id || null;
  const guestId = !userId
    ? (request.headers['x-guest-id'] as string) || (request.query as any).guestId || null
    : null;
  const isGuest = !userId;

  const authHeader = request.headers.authorization;
  const prisma = request.server.prisma;

  if (!message || typeof message !== 'string' || !message.trim()) {
    reply.status(400).send({ error: 'Message is required' });
    return;
  }

  if (!userId && !guestId) {
    reply.status(401).send({ error: 'Unauthorized: User ID or Guest ID is required' });
    return;
  }

  // Setup SSE
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
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
    // 1. Fetch User Memory (Preferences) - Only for Authenticated Users
    let userPreferences = 'Chưa có thông tin.';
    let historyText = '';

    if (!isGuest && userId) {
      const memory = await prisma.userAssistantMemory.findUnique({ where: { user_id: userId } });
      if (memory?.preferences) {
        userPreferences = JSON.stringify(memory.preferences);
      }

      // 2. Fetch Recent Chat History (Last 10 messages)
      const recentMessages = await prisma.assistantMessage.findMany({
        where: { user_id: userId, business_id: businessId || null },
        orderBy: { created_at: 'desc' },
        take: 10,
      });
      historyText = recentMessages
        .reverse()
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n');
    }

    // 3. Fetch Strategy Context (Chunks + Capabilities) from AI Controller
    let strategyContextText = '';
    let capabilitiesText = '';

    if (STRATEGY_INTERNAL_TOKEN) {
      try {
        const retrieveRes = await fetch(`${AI_CONTROLLER_URL}/internal/strategy/retrieve-context`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Strategy-Token': STRATEGY_INTERNAL_TOKEN,
          },
          body: JSON.stringify({ question: message, context: {} }),
        });

        if (retrieveRes.ok) {
          const retrieveData = await retrieveRes.json();
          const chunks = retrieveData.chunks || [];
          const caps = retrieveData.capabilities || [];

          if (chunks.length > 0) {
            strategyContextText =
              '--- TRI THỨC TƯ VẤN ---\n' +
              chunks
                .map((c: any, i: number) => `[${i + 1}] ${c.title}\n${c.summary}`)
                .join('\n\n') +
              '\n';
          }
          if (caps.length > 0) {
            capabilitiesText =
              '--- ĐẶC TẢ API PAYLOAD ---\n' +
              caps
                .map(
                  (c: any) =>
                    `• [${c.capability_id}] ${c.display_name}\n  Schema: ${JSON.stringify(c.parameter_schema)}\n  Example Input: ${JSON.stringify(c.example_input)}`,
                )
                .join('\n\n') +
              '\n';
          }
        }
      } catch (err) {
        request.log.error({ err }, '[assistant] Failed to retrieve strategy context');
      }
    }

    const guestInstruction = isGuest
      ? `\nTƯ CÁCH NGƯỜI DÙNG: GUEST (Khách viếng thăm chưa đăng nhập).\nBẠN BỊ CẤM GỌI CÔNG CỤ (MCP Tools) VÀ CẤM TRẢ VỀ \`actionPayloads\`. Bạn CHỈ được phép tư vấn, đưa ra lời khuyên và lên kế hoạch (Plan) dựa trên Tri thức có sẵn. Nếu có ActionPayload, hãy để mảng \`actionPayloads\` rỗng.`
      : `\nTƯ CÁCH NGƯỜI DÙNG: AUTHENTICATED USER.\nBạn có toàn quyền gọi Tools và trả về \`actionPayloads\` thực tế dựa trên Schema đặc tả để cài đặt hệ thống.`;

    const systemPrompt = `[SYSTEM]: Bạn là **Enterprise Solutions Architect (Giám đốc Vận hành & Giải pháp)** của hệ sinh thái Biztada (business ID: ${businessId || 'N/A'}).
Thông tin ghi nhớ về người dùng này: ${userPreferences}${guestInstruction}

SỨ MỆNH: Khi người dùng đưa ra một mục tiêu kinh doanh, TUYỆT ĐỐI KHÔNG làm ngay một bước đơn lẻ. Bạn PHẢI dùng tư duy Kiến trúc sư để phân tích và đề xuất một Quy trình Tự động hóa.

${strategyContextText}
${capabilitiesText}

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

CÁCH TRẢ VỀ KẾT QUẢ (BẮT BUỘC):
TRONG MỌI TRƯỜNG HỢP, BẠN BẮT BUỘC PHẢI TRẢ VỀ DUY NHẤT 1 KHỐI JSON (TUYỆT ĐỐI KHÔNG VIẾT VĂN BẢN NÀO BÊN NGOÀI KHỐI JSON NÀY). Khối JSON phải tuân thủ Schema sau:
\`\`\`json
{
  "blackboard": {
    "current_objective": "Mục tiêu hiện tại đang giải quyết là gì?",
    "gathered_info": "Bạn đã biết được những thông tin gì từ lịch sử?",
    "next_step": "Bạn định làm gì tiếp theo (Gọi tool hay Trả lời user?)"
  },
  "TOOL_CALL": "Tên tool nếu bạn cần gọi (để rỗng hoặc xoá nếu không gọi)",
  "TOOL_ARGS": { "name": "...", "arguments": {} },
  "reply": "Văn bản giải thích cho người dùng đọc (chỉ dùng khi ĐÃ GỌI XONG tool hoặc KHÔNG CẦN gọi tool. Dùng Markdown, KHÔNG chứa JSON Payload kỹ thuật)",
  "actionPayloads": [
    { "Tên cấu hình/Payload API dựa trên Schema": "..." }
  ]
}
\`\`\`
Lưu ý:
- Nếu bạn cần GỌI TOOL (như mcp_call_tool), hãy điền \`TOOL_CALL\` và để rỗng \`reply\`. Hệ thống sẽ trả kết quả tool cho bạn phân tích tiếp.
- Nếu bạn đã đủ thông tin và muốn ĐƯA RA CÂU TRẢ LỜI cho user, hãy bỏ trống \`TOOL_CALL\` và điền vào \`reply\`, cùng với \`actionPayloads\` nếu cần thực thi các cấu hình API.

[LỊCH SỬ GẦN ĐÂY]
${historyText}`;

    let currentPrompt = `${systemPrompt}\n\n[USER]: ${message}`;
    let replyText = '';
    const toolActions: string[] = [];

    // Save User message (only for authenticated users)
    if (!isGuest && userId) {
      await prisma.assistantMessage.create({
        data: {
          user_id: userId,
          business_id: businessId || null,
          role: 'user',
          content: message,
        },
      });
    }

    let finalReply = replyText;
    let actionPayloads: any[] = [];

    const MAX_STEPS = 6;
    for (let step = 0; step < MAX_STEPS; step++) {
      sendSSE('progress', { message: `AI đang phân tích (Step ${step + 1}/${MAX_STEPS})...` });
      replyText = await generateAssistantText(currentPrompt);

      let parsedData: any = null;
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
        parsedData = JSON.parse(jsonString);
      } catch (e: any) {
        // Self-Correction Trigger
        currentPrompt += `\n\n[SYSTEM_ERROR]: Lỗi định dạng JSON (Error: ${e.message}). Phản hồi của bạn không phải là một chuỗi JSON hợp lệ. Hãy kiểm tra lại cấu trúc, tự sửa lỗi ngoặc/dấu phẩy và xuất lại duy nhất JSON chuẩn xác theo Schema quy định.`;
        continue;
      }

      if (parsedData.TOOL_CALL) {
        try {
          const toolName = parsedData.TOOL_CALL;
          toolActions.push(toolName);
          request.log.info({ toolName }, '[assistant] executing tool');
          sendSSE('tool_call', {
            name: toolName,
            message: `Hệ thống đang truy xuất dữ liệu: ${toolName}...`,
          });

          let toolResult: any = null;
          if (toolName === 'update_user_memory') {
            // Handle memory update
            const prefs = parsedData.TOOL_ARGS || {};
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
              const name = parsedData.TOOL_ARGS?.name;
              const args = parsedData.TOOL_ARGS?.arguments || {};
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

          currentPrompt += `\n\n[ASSISTANT_TOOL_CALL]: ${rawToolMatch}\n[TOOL_RESULT]: ${JSON.stringify(toolResult)}\n[SYSTEM]: Dựa vào kết quả trên, hãy tiếp tục cập nhật Blackboard và phân tích. Nếu cần gọi tool tiếp thì trả về \`TOOL_CALL\`, nếu xong thì trả về \`reply\`.`;
          continue;
        } catch (e) {
          currentPrompt += `\n\n[TOOL_RESULT]: {"error": "Lỗi khi gọi tool"}\n[SYSTEM]: Hãy thông báo lỗi này cho người dùng hoặc tự phân tích nguyên nhân.`;
          continue;
        }
      } else {
        // No TOOL_CALL, check if we have a reply
        if (parsedData.reply) {
          finalReply = parsedData.reply;
          if (parsedData.actionPayloads && Array.isArray(parsedData.actionPayloads)) {
            actionPayloads = parsedData.actionPayloads;
          }
          break; // Done
        } else {
          // Empty TOOL_CALL and empty reply -> Invalid response
          currentPrompt += `\n\n[SYSTEM_ERROR]: Lỗi Logic. Bạn đã trả về JSON nhưng thiếu cả \`TOOL_CALL\` và \`reply\`. Hãy cập nhật lại Blackboard, nếu cần gọi Tool thì điền \`TOOL_CALL\`, nếu muốn tư vấn thì điền \`reply\`.`;
          continue;
        }
      }
    }

    // Attempt to parse the structured JSON response as fallback in case we exit the loop without a proper break
    // This handles the case where it maxes out at 6 steps
    if (finalReply === replyText) {
      try {
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
        request.log.warn('Failed to parse structured AI output at the end. Using raw text.');
      }
    }

    // Save Assistant message (only for authenticated users)
    if (!isGuest && userId) {
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
    }

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
