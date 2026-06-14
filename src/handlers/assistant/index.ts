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
  let userId = userPayload?.userId || userPayload?.user_id || null;

  if (!userId) {
    // Fallback to x-user-id header if JWT auth fails (matching consultHandler logic)
    userId = (request.headers['x-user-id'] as string) || null;
  }

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

const orchestratorPrompt = `[SYSTEM]: Bạn là **Quản đốc Phân tích (Orchestrator Agent)** của hệ sinh thái Biztada (business ID: ${businessId || 'N/A'}).
Thông tin người dùng: ${userPreferences}${guestInstruction}

SỨ MỆNH: Đọc Lịch sử Trò chuyện và Yêu cầu hiện tại của người dùng. Phân loại yêu cầu thành 1 trong 3 quyết định:
1. "CHAT": Trả lời thông thường (Tư vấn, giải thích, trò chuyện).
2. "ASK_USER": Yêu cầu người dùng cung cấp thêm thông tin BẮT BUỘC để chạy công cụ.
3. "EXECUTE_TOOL": Chạy API công cụ (Chỉ khi ĐÃ ĐỦ thông tin).

${strategyContextText}
${capabilitiesText}

Danh sách các Tools hệ thống:
${JSON.stringify(await mcpServer.getTools(authHeader), null, 2)}
Công cụ nội bộ: get_marketing_dashboard, get_worker_stats, get_active_workflows, get_dashboard_activity, update_user_memory.

CÁCH TRẢ VỀ KẾT QUẢ: Bắt buộc trả về duy nhất 1 khối JSON chuẩn xác:
\`\`\`json
{
  "decision": "CHAT" | "ASK_USER" | "EXECUTE_TOOL",
  "reasoning": "Lý do ngắn gọn",
  "tool_name": "Tên tool (nếu EXECUTE_TOOL)",
  "tool_payload": { /* arguments object */ } (nếu EXECUTE_TOOL),
  "reply": "Văn bản Markdown để nói với người dùng (nếu CHAT hoặc ASK_USER)"
}
\`\`\`

LUẬT CẤM KỴ: 
- Nếu bạn cần gọi Tool nhưng trong Lịch sử trò chuyện NGƯỜI DÙNG CHƯA CUNG CẤP ĐỦ THÔNG TIN (ví dụ: tạo tài khoản thì phải có username/password, tạo campaign phải có tên...), TUYỆT ĐỐI KHÔNG TỰ BỊA RA DỮ LIỆU ĐỂ GỌI TOOL.
- Trong trường hợp thiếu dữ liệu, phải chọn \`ASK_USER\` và đặt câu hỏi lịch sự vào \`reply\` để thu thập dữ liệu từ người dùng.

=== LỊCH SỬ TRÒ CHUYỆN (Sử dụng làm ngữ cảnh) ===
${historyText || 'Chưa có lịch sử.'}
==========================

[USER'S CURRENT REQUEST]: ${message}`;

    let finalReply = '';
    const toolActions: string[] = [];
    let actionPayloads: any[] = [];

    // Helper: Parse JSON
    const parseJSON = (text: string) => {
      const jsonRegex = /\`\`\`(?:json)?\s*(\{[\s\S]*?\})\s*\`\`\`/;
      const match = text.match(jsonRegex);
      let jsonString = text;
      if (match && match[1]) {
        jsonString = match[1];
      } else {
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonString = text.substring(startIdx, endIdx + 1);
        }
      }
      try { return JSON.parse(jsonString); } catch (e) { return null; }
    };

    // Save User message
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

    // --- PHASE 1: ORCHESTRATOR ---
    let orchestratorResponse = await generateAssistantText(orchestratorPrompt);
    let decisionData = parseJSON(orchestratorResponse);

    // Fallback if LLM failed to return JSON
    if (!decisionData) {
      const fixPrompt = orchestratorPrompt + `\n\n[LỖI]: Bạn đã trả về văn bản thường thay vì JSON. Hãy output lại đúng chuẩn JSON.`;
      orchestratorResponse = await generateAssistantText(fixPrompt);
      decisionData = parseJSON(orchestratorResponse);
    }

    if (!decisionData) {
      finalReply = 'Lỗi hệ thống: Không thể khởi tạo quy trình tư duy. Vui lòng thử lại sau.';
    } else {
      if (decisionData.decision === 'ASK_USER') {
        // --- PHASE 2A: ASK USER (SLOT FILLING) ---
        finalReply = decisionData.reply || 'Để tôi hỗ trợ bạn tốt nhất, vui lòng cung cấp thêm thông tin.';
      } 
      else if (decisionData.decision === 'EXECUTE_TOOL' && decisionData.tool_name) {
        // --- PHASE 2B: EXECUTION AGENT ---
        const toolName = decisionData.tool_name;
        const toolArgs = decisionData.tool_payload || {};
        toolActions.push(toolName);
        
        sendSSE('progress', { message: `Ghi chú: Đang tổng hợp dữ liệu để gọi lệnh ${toolName}...` });
        sendSSE('tool_call', { name: toolName, message: `Hệ thống đang truy xuất dữ liệu: ${toolName}...` });
        
        let toolResult: any = null;
        if (toolName === 'update_user_memory') {
          const prefs = toolArgs || {};
          await prisma.userAssistantMemory.upsert({
            where: { user_id: userId },
            update: { preferences: prefs },
            create: { user_id: userId, preferences: prefs },
          });
          toolResult = { success: true, message: 'Memory updated successfully.' };
        } else if (!authHeader) {
          toolResult = { error: 'Missing authorization token to call tools.' };
        } else {
          try {
            if (toolName === 'get_marketing_dashboard')
              toolResult = await getMarketingDashboard(authHeader, businessId);
            else if (toolName === 'get_worker_stats') toolResult = await getWorkerStats(authHeader, businessId);
            else if (toolName === 'get_active_workflows')
              toolResult = await getActiveWorkflows(authHeader, businessId);
            else if (toolName === 'get_dashboard_activity')
              toolResult = await getDashboardActivity(authHeader, businessId);
            else {
              toolResult = await mcpServer.callTool(
                authHeader,
                { name: toolName, arguments: toolArgs },
                prisma,
                businessId,
              );
            }
          } catch (e: any) {
            toolResult = { error: e.message || 'Lỗi khi thực thi công cụ' };
          }
        }

        // --- PHASE 3: SUMMARIZER AGENT ---
        sendSSE('progress', { message: 'Đang tổng hợp kết quả để báo cáo cho bạn...' });
        const summarizerPrompt = `[SYSTEM]: Bạn là Kế toán Báo cáo. Kỹ sư vừa gọi xong API và trả về kết quả dưới đây. 
Nhiệm vụ của bạn là dịch kết quả này thành câu trả lời dễ hiểu, lịch sự, và có format Markdown rõ ràng cho người dùng (có thể dùng Table, List, Đậm nhạt). Tuyệt đối không để lộ mã code hay raw JSON cho user.

[KẾT QUẢ API]: ${JSON.stringify(toolResult)}
[CÂU HỎI BAN ĐẦU CỦA USER]: ${message}

LƯU Ý: Nếu kết quả API có báo "error", hãy giải thích lỗi đó một cách nhẹ nhàng và hướng dẫn người dùng cách khắc phục.`;
        
        finalReply = await generateAssistantText(summarizerPrompt);
      } 
      else {
        // --- PHASE 2C: CHAT ---
        finalReply = decisionData.reply || orchestratorResponse;
      }
    }

    // Attempt to extract action payloads from final reply if any
    const finalParsed = parseJSON(finalReply);
    if (finalParsed && finalParsed.actionPayloads) {
      actionPayloads = finalParsed.actionPayloads;
      if (finalParsed.reply) finalReply = finalParsed.reply;
    } else if (finalParsed && finalParsed.reply) {
       finalReply = finalParsed.reply;
    }

    // Clean up finalReply if it still contains JSON markdown
    finalReply = finalReply.replace(/\`\`\`(?:json)?\s*\{[\s\S]*?\}\s*\`\`\`/g, '').trim();
    if (!finalReply) finalReply = 'Hệ thống đã xử lý xong yêu cầu của bạn.';

    // Save Assistant message
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
  const userPayload = (request as any).user;
  const userId = userPayload?.userId || userPayload?.user_id;
  const businessId = request.headers['x-business-id'] as string | undefined;
  const prisma = request.server.prisma;

  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const query = request.query as any;
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  try {
    const messages = await prisma.assistantMessage.findMany({
      where: { user_id: userId, business_id: businessId || null },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    const orderedMessages = messages.reverse();

    return reply.status(200).send({
      messages: orderedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        toolActions: m.tool_actions || [],
      })),
    });
  } catch (err) {
    request.log.error({ err }, '[assistant] historyHandler failed');
    return reply.status(500).send({ error: 'Failed to fetch history' });
  }
}

export async function clearHistoryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userPayload = (request as any).user;
  const userId = userPayload?.userId || userPayload?.user_id;
  const businessId = request.headers['x-business-id'] as string | undefined;
  const prisma = request.server.prisma;

  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    await prisma.assistantMessage.deleteMany({
      where: { user_id: userId, business_id: businessId || null },
    });

    return reply.status(200).send({ success: true });
  } catch (err) {
    request.log.error({ err }, '[assistant] clearHistoryHandler failed');
    return reply.status(500).send({ error: 'Failed to clear history' });
  }
}
