import { FastifyRequest, FastifyReply } from 'fastify';
import { generateAssistantText } from '@services/aiControllerClient';
import {
  getMarketingDashboard,
  getWorkerStats,
  getActiveWorkflows,
  getDashboardActivity,
} from '@services/apiDispatcherClient';
import { mcpServer } from '../../mcp/server';
import { toolRAG } from '@services/toolRag';

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
    let workingMemoryStr = 'Không có.';
    let existingPrefs: any = {};
    let historyText = '';

    if (!isGuest && userId) {
      const memory = await prisma.userAssistantMemory.findUnique({ where: { user_id: userId } });
      if (memory?.preferences) {
        existingPrefs =
          typeof memory.preferences === 'string'
            ? JSON.parse(memory.preferences)
            : memory.preferences;
        userPreferences = JSON.stringify(existingPrefs);
        if (existingPrefs.working_memory) {
          workingMemoryStr = JSON.stringify(existingPrefs.working_memory);
        }
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

    // Helper: Parse JSON
    const parseJSON = (text: string) => {
      const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
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
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        return null;
      }
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

    const guestInstruction = isGuest
      ? `\nTƯ CÁCH NGƯỜI DÙNG: GUEST (Khách viếng thăm chưa đăng nhập).\nBạn CHỈ được phép tư vấn và trả lời thông thường (CHAT). KHÔNG CÓ QUYỀN thực thi TASK.`
      : `\nTƯ CÁCH NGƯỜI DÙNG: AUTHENTICATED USER.\nBạn có toàn quyền phân loại yêu cầu thành TASK nếu cần thiết.`;

    // --- PHASE 1: ROUTER AGENT (INTENT DETECTION) ---
    const routerPrompt = `[SYSTEM]: Bạn là **Điều phối viên (Router Agent)** của hệ sinh thái Biztada.
Bạn có nhiệm vụ đọc Lịch sử trò chuyện và Yêu cầu mới nhất của người dùng để phân loại ý định của họ.

Thông tin người dùng: ${userPreferences}${guestInstruction}

[BỘ NHỚ LÀM VIỆC HIỆN TẠI (WORKING MEMORY)]:
${workingMemoryStr}

PHÂN LOẠI YÊU CẦU:
1. "CHAT": Trả lời thông thường (Tư vấn chung chung, giải thích, trò chuyện, chào hỏi, hoặc người dùng chỉ đang trả lời câu hỏi mà không có ý định bắt đầu/thực hiện một tác vụ phần mềm/công cụ nào rõ ràng).
2. "TASK": Người dùng yêu cầu thực hiện MỘT NHIỆM VỤ CỤ THỂ liên quan đến hệ thống phần mềm (vd: tạo tài khoản, tạo chiến dịch, thu thập thông tin, cấu hình worker, đăng bài, lấy dữ liệu bảng điều khiển...).

CÁCH TRẢ VỀ KẾT QUẢ: Bắt buộc trả về JSON:
\`\`\`json
{
  "intent": "CHAT" | "TASK",
  "reasoning": "Lý do ngắn gọn",
  "task_summary": "Tóm tắt chính xác người dùng muốn làm gì và các thông tin họ ĐÃ CUNG CẤP (chỉ điền nếu intent là TASK. Nếu CHAT hãy để trống)",
  "reply": "Câu trả lời ngay cho người dùng nếu intent là CHAT. (bỏ trống nếu TASK)"
}
\`\`\`

=== LỊCH SỬ TRÒ CHUYỆN ===
${historyText || 'Chưa có lịch sử.'}
==========================

[USER'S CURRENT REQUEST]: ${message}`;

    let finalReply = '';
    const toolActions: string[] = [];
    let actionPayloads: any[] = [];

    let routerResponse = await generateAssistantText(routerPrompt);
    let routerData = parseJSON(routerResponse);

    if (!routerData) {
      routerResponse = await generateAssistantText(
        routerPrompt + `\n\n[LỖI]: Vui lòng trả về đúng chuẩn JSON.`,
      );
      routerData = parseJSON(routerResponse);
    }

    if (!routerData) {
      finalReply = 'Lỗi hệ thống: Không thể khởi tạo quy trình phân loại. Vui lòng thử lại sau.';
    } else if (routerData.intent === 'CHAT') {
      // Intent CHAT -> Stop here and return the reply directly
      finalReply = routerData.reply || 'Dạ, tôi nghe đây ạ.';
    } else {
      // --- PHASE 2: PLANNER AGENT (TOOL SELECTION) ---
      sendSSE('progress', {
        message: `Đang lập kế hoạch thực thi cho: ${routerData.task_summary || 'Tác vụ'}...`,
      });

      let strategyContextText = '';
      let chunksList: any[] = [];
      let fullCaps: any[] = [];
      const mcpTools = await mcpServer.getTools(authHeader);

      if (STRATEGY_INTERNAL_TOKEN) {
        try {
          const retrieveRes = await fetch(
            `${AI_CONTROLLER_URL}/internal/strategy/retrieve-context`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-Strategy-Token': STRATEGY_INTERNAL_TOKEN,
              },
              body: JSON.stringify({ question: routerData.task_summary || message, context: {} }),
            },
          );

          if (retrieveRes.ok) {
            const retrieveData = await retrieveRes.json();
            chunksList = retrieveData.chunks || [];
            fullCaps = retrieveData.capabilities || [];

            if (chunksList.length > 0) {
              strategyContextText =
                '--- TRI THỨC TƯ VẤN (CÓ THỂ DÙNG ĐỂ THAM KHẢO) ---\n' +
                chunksList
                  .map((c: any, i: number) => `[${i + 1}] ${c.title}\n${c.summary}`)
                  .join('\n\n') +
                '\n';
            }
          }
        } catch (err) {
          request.log.error({ err }, '[assistant] Failed to retrieve strategy context');
        }
      }

      // Prepare Short List for Planner
      // Dynamically filter mcpTools to Top 10 using Tool RAG to prevent attention degradation
      const filteredMcpTools = toolRAG.search(routerData.task_summary || message, mcpTools, 10);
      const shortMcpTools = filteredMcpTools.map((t) => ({
        name: t.name,
        description: t.description,
      }));

      const shortCapsTools = fullCaps.map((c) => ({
        name: c.capability_id,
        description: c.display_name,
      }));
      const allShortTools = [...shortMcpTools, ...shortCapsTools];

      const internalTools = [
        { name: 'get_marketing_dashboard', description: 'Lấy dữ liệu bảng điều khiển marketing' },
        { name: 'get_worker_stats', description: 'Lấy thống kê worker' },
        { name: 'get_active_workflows', description: 'Lấy danh sách workflow đang chạy' },
        { name: 'get_dashboard_activity', description: 'Lấy hoạt động gần đây' },
        { name: 'update_user_memory', description: 'Cập nhật bộ nhớ' },
      ];

      const plannerPrompt = `[SYSTEM]: Bạn là **Chuyên gia Lập Kế hoạch (Planner Agent)** của hệ sinh thái Biztada.
Nhiệm vụ của bạn là đọc Tóm tắt yêu cầu của người dùng và Danh sách Công cụ (chỉ gồm Tên và Mô tả), sau đó chọn ra (các) công cụ phù hợp nhất để giải quyết yêu cầu.

[USER'S TASK SUMMARY]: ${routerData.task_summary || message}

DANH SÁCH CÔNG CỤ HIỆN CÓ:
${JSON.stringify([...allShortTools, ...internalTools], null, 2)}

CÁCH TRẢ VỀ KẾT QUẢ: Bắt buộc trả về duy nhất JSON:
\`\`\`json
{
  "selected_tools": ["tên_công_cụ_1", "tên_công_cụ_2"],
  "plan": "Giải thích ngắn gọn lý do chọn và các bước sẽ làm"
}
\`\`\`
Nếu không có công cụ nào phù hợp, hãy trả về mảng \`selected_tools\` rỗng.`;

      let plannerResponse = await generateAssistantText(plannerPrompt);
      let plannerData = parseJSON(plannerResponse);

      if (!plannerData || !Array.isArray(plannerData.selected_tools)) {
        plannerResponse = await generateAssistantText(
          plannerPrompt + `\n\n[LỖI]: Trả về JSON không hợp lệ.`,
        );
        plannerData = parseJSON(plannerResponse);
      }

      const selectedTools: string[] = plannerData?.selected_tools || [];

      // --- PHASE 3: ORCHESTRATOR AGENT (SLOT FILLING & EXECUTION) ---
      sendSSE('progress', {
        message: `Đang đối chiếu dữ liệu để chuẩn bị gọi API...`,
      });

      // Lọc Full Schema cho các tool đã chọn
      const selectedMcpTools = mcpTools.filter((t) => selectedTools.includes(t.name));
      const selectedCaps = fullCaps.filter((c) => selectedTools.includes(c.capability_id));

      let capabilitiesText = '';
      if (selectedCaps.length > 0) {
        capabilitiesText =
          '--- ĐẶC TẢ API PAYLOAD TỪ BIZTADA ---\n' +
          selectedCaps
            .map(
              (c: any) =>
                `• [${c.capability_id}] ${c.display_name}\n  Schema: ${JSON.stringify(c.parameter_schema)}\n  Example Input: ${JSON.stringify(c.example_input)}`,
            )
            .join('\n\n') +
          '\n';
      }

      const orchestratorPrompt = `[SYSTEM]: Bạn là **Quản đốc Phân tích (Orchestrator Agent)** của hệ sinh thái Biztada (business ID: ${businessId || 'N/A'}).
Nhiệm vụ của bạn là kiểm tra xem chúng ta đã đủ thông tin từ người dùng để gọi Công cụ (Tool) đã được chọn hay chưa.

[BỘ NHỚ LÀM VIỆC HIỆN TẠI (WORKING MEMORY)]:
${workingMemoryStr}

${strategyContextText}
${capabilitiesText}

Danh sách các Tools hệ thống ĐƯỢC CHỌN CHO TÁC VỤ NÀY (Chỉ dùng các tool này):
${JSON.stringify(selectedMcpTools, null, 2)}
Công cụ nội bộ có thể dùng nếu có trong plan: ${selectedTools.filter((t) => internalTools.some((i) => i.name === t)).join(', ')}

SỨ MỆNH: Phân loại yêu cầu thành 1 trong 2 quyết định:
1. "ASK_USER": Yêu cầu người dùng cung cấp thêm thông tin BẮT BUỘC để chạy công cụ hoặc để quyết định bước tiếp theo.
2. "EXECUTE_TOOL": Chạy API công cụ (Chỉ khi ĐÃ ĐỦ thông tin theo Schema). LƯU Ý: Rất hoan nghênh việc chủ động chạy API (vd: gọi API lấy danh sách) rồi dùng kết quả đó để báo cáo/hỏi ý kiến người dùng.

CÁCH TRẢ VỀ KẾT QUẢ: Bắt buộc trả về JSON chuẩn xác:
\`\`\`json
{
  "decision": "ASK_USER" | "EXECUTE_TOOL",
  "reasoning": "Lý do ngắn gọn",
  "tool_name": "Tên tool (nếu EXECUTE_TOOL)",
  "tool_payload": { /* arguments object */ } (nếu EXECUTE_TOOL),
  "working_memory": {
    "main_objective": "Mục tiêu CHÍNH hiện tại của người dùng là gì? (vd: Tạo workflow seeding)",
    "dag_stack": [
      { "step": "Tên bước phụ đã/đang làm", "status": "completed | pending", "result": "Kết quả nếu có" }
    ],
    "context_summary": "Tóm tắt các dữ liệu ĐÃ thu thập được và CÒN THIẾU"
  },
  "reply": "Văn bản Markdown để hỏi/báo cáo người dùng (chỉ điền nếu ASK_USER)"
}
\`\`\`

LUẬT CẤM KỴ (SLOT-FILLING - RẤT QUAN TRỌNG): 
- TUYỆT ĐỐI KHÔNG TỰ BỊA RA DỮ LIỆU ĐỂ GỌI TOOL.
- Trong trường hợp thiếu dữ liệu bắt buộc (Required Fields), bạn PHẢI chọn \`ASK_USER\` và đặt câu hỏi rõ ràng vào \`reply\` để thu thập dữ liệu còn thiếu.
- Chỉ khi nhận ĐỦ tất cả required fields thì mới được chọn \`EXECUTE_TOOL\`.

=== LỊCH SỬ TRÒ CHUYỆN ===
${historyText || 'Chưa có lịch sử.'}
==========================

[USER'S CURRENT REQUEST]: ${message}
[TASK SUMMARY TỪ ROUTER]: ${routerData.task_summary}
[PLANNER ĐỀ XUẤT]: ${plannerData?.plan || 'Không rõ'}`;

      let orchestratorResponse = await generateAssistantText(orchestratorPrompt);
      let decisionData = parseJSON(orchestratorResponse);

      // Fallback if LLM failed to return JSON
      if (!decisionData) {
        const fixPrompt =
          orchestratorPrompt +
          `\n\n[LỖI]: Bạn đã trả về văn bản thường thay vì JSON. Hãy output lại đúng chuẩn JSON.`;
        orchestratorResponse = await generateAssistantText(fixPrompt);
        decisionData = parseJSON(orchestratorResponse);
      }

      // Upsert working_memory asynchronously
      if (!isGuest && userId && decisionData?.working_memory) {
        existingPrefs.working_memory = decisionData.working_memory;
        prisma.userAssistantMemory
          .upsert({
            where: { user_id: userId },
            update: { preferences: existingPrefs },
            create: { user_id: userId, preferences: existingPrefs },
          })
          .catch((err) => request.log.error({ err }, 'Failed to upsert working memory'));
      }

      if (!decisionData) {
        finalReply = 'Lỗi hệ thống: Không thể khởi tạo quy trình thực thi. Vui lòng thử lại sau.';
      } else if (decisionData.decision === 'ASK_USER') {
        // --- PHASE 2A: ASK USER (SLOT FILLING) ---
        finalReply =
          decisionData.reply || 'Để tôi hỗ trợ bạn tốt nhất, vui lòng cung cấp thêm thông tin.';
      } else if (decisionData.decision === 'EXECUTE_TOOL' && decisionData.tool_name) {
        // --- PHASE 2B: EXECUTION AGENT ---
        const toolName = decisionData.tool_name;
        const toolArgs = decisionData.tool_payload || {};
        toolActions.push(toolName);

        sendSSE('progress', {
          message: `Ghi chú: Đang tổng hợp dữ liệu để gọi lệnh ${toolName}...`,
        });
        sendSSE('tool_call', {
          name: toolName,
          message: `Hệ thống đang truy xuất dữ liệu: ${toolName}...`,
        });

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
            else if (toolName === 'get_worker_stats')
              toolResult = await getWorkerStats(authHeader, businessId);
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
      } else {
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
    finalReply = finalReply.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '').trim();
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

      // --- BACKGROUND TASK: AUTO CONTEXT SUMMARIZATION ---
      const totalMessages = await prisma.assistantMessage.count({
        where: { user_id: userId, business_id: businessId || null },
      });
      // Run summarization every 5 messages
      if (totalMessages > 0 && totalMessages % 5 === 0) {
        runBackgroundSummarizer(userId, businessId || null, prisma, existingPrefs).catch((err) => {
          request.log.error({ err }, 'Background summarizer failed');
        });
      }
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

async function runBackgroundSummarizer(
  userId: string,
  businessId: string | null,
  prisma: any,
  existingPrefs: any,
) {
  try {
    // 1. Fetch last 10 messages to summarize
    const recentMessages = await prisma.assistantMessage.findMany({
      where: { user_id: userId, business_id: businessId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    if (recentMessages.length === 0) return;

    const historyText = recentMessages
      .reverse()
      .map((m: any) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n');

    let currentWorkingMemory = 'Không có.';
    if (existingPrefs.working_memory) {
      currentWorkingMemory = JSON.stringify(existingPrefs.working_memory);
    }

    const prompt = `[SYSTEM]: Bạn là Kỹ sư Tóm tắt Bối cảnh (Context Summarizer Agent).
Nhiệm vụ của bạn là đọc Bộ nhớ hiện tại và Lịch sử 10 tin nhắn gần nhất, sau đó HỢP NHẤT chúng thành một bản tóm tắt ngắn gọn.
Mục đích là để lưu lại các thông tin quan trọng (vấn đề đang bàn, quyết định đã đưa ra) tránh bị quên khi lịch sử quá dài.

[BỘ NHỚ LÀM VIỆC HIỆN TẠI]:
${currentWorkingMemory}

[10 TIN NHẮN GẦN NHẤT]:
${historyText}

CÁCH TRẢ VỀ KẾT QUẢ: Bắt buộc trả về JSON:
\`\`\`json
{
  "working_memory": {
    "main_objective": "Mục tiêu CHÍNH hiện tại của người dùng là gì?",
    "dag_stack": [
      { "step": "Tên bước phụ", "status": "completed | pending", "result": "Tóm tắt kết quả" }
    ],
    "context_summary": "Tóm tắt GỌN GÀNG những thông tin/dữ kiện quan trọng đã thảo luận từ trước đến nay."
  }
}
\`\`\`
`;

    let response = await generateAssistantText(prompt);

    // Parse JSON
    const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
    const match = response.match(jsonRegex);
    if (match && match[1]) {
      response = match[1];
    } else {
      const startIdx = response.indexOf('{');
      const endIdx = response.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        response = response.substring(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(response);
    if (parsed && parsed.working_memory) {
      existingPrefs.working_memory = parsed.working_memory;
      await prisma.userAssistantMemory.upsert({
        where: { user_id: userId },
        update: { preferences: existingPrefs },
        create: { user_id: userId, preferences: existingPrefs },
      });
      console.log(`[Auto-Summarizer] Cập nhật thành công cho user: ${userId.substring(0, 8)}`);
    }
  } catch (error) {
    console.error('[runBackgroundSummarizer] Error:', error);
  }
}
