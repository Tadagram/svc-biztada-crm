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
const BUSINESS_CRM_URL =
  process.env.SVC_BUSINESS_CRM_URL ?? 'http://svc-business-crm.tadagram.svc.cluster.local:80';
const STRATEGY_INTERNAL_TOKEN = process.env.STRATEGY_INTERNAL_TOKEN ?? '';

export async function chatHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { message, attachments } = request.body as { message: string; attachments?: any[] };
  const businessId = request.headers['x-business-id'] as string | undefined;

  let messageWithAttachments = message;
  if (attachments && attachments.length > 0) {
    const attachmentContext = attachments
      .map((a) => `[Đã đính kèm ảnh: asset_id = ${a.asset_id}]`)
      .join(' ');
    messageWithAttachments = `${message}\n${attachmentContext}`;
  }

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
    // 1. Fetch User Memory & Business Context
    let userPreferences = 'Chưa có thông tin.';
    let workingMemoryStr = 'Không có.';
    let businessContextStr = 'Chưa có thông tin.';
    let existingPrefs: any = {};
    let historyText = '';

    if (!isGuest && userId) {
      if (businessId) {
        try {
          const bizRes = await fetch(`${BUSINESS_CRM_URL}/api/business/me`, {
            headers: { authorization: authHeader, 'x-business-id': businessId } as any,
          });
          if (bizRes.ok) {
            const bizData = await bizRes.json();
            const b = bizData.data?.business;
            if (b) {
              businessContextStr = `Ngành hàng: ${b.industry || 'Chưa rõ'} | Khách hàng mục tiêu (Target Audience): ${b.targetAudience || 'CHƯA CUNG CẤP'} | Mục tiêu truyền thông (Media Goals): ${b.mediaGoals || 'CHƯA CUNG CẤP'}`;
            }
          }
        } catch (err) {
          request.log.error({ err }, 'Failed to fetch business info');
        }
      }

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
          content: messageWithAttachments,
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
[THÔNG TIN DOANH NGHIỆP HIỆN TẠI]:
${businessContextStr}

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

[USER'S CURRENT REQUEST]: ${messageWithAttachments}`;

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
      const mcpTools = await mcpServer.getTools(authHeader, request.server.prisma);

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
        {
          name: 'update_business_info',
          description:
            'Cập nhật thông tin doanh nghiệp (Ngành hàng, Khách hàng mục tiêu, Mục tiêu truyền thông)',
        },
      ];

      const plannerPrompt = `[SYSTEM]: Bạn là **Chuyên gia Lập Kế hoạch (Planner Agent)** của hệ sinh thái Biztada.
Nhiệm vụ của bạn là đọc Tóm tắt yêu cầu của người dùng và Danh sách Công cụ (chỉ gồm Tên và Mô tả), sau đó chọn ra (các) công cụ phù hợp nhất để giải quyết yêu cầu.

[THÔNG TIN DOANH NGHIỆP HIỆN TẠI]:
${businessContextStr}

[USER'S TASK SUMMARY]: ${routerData.task_summary || messageWithAttachments}

LƯU Ý DÀNH CHO PLANNER:
- NẾU yêu cầu của người dùng là thực hiện "chiến dịch", "seeding", "kế hoạch", BẮT BUỘC bạn phải CÓ CHỌN tool \`query_ai_knowledge_base\` để tra cứu "ai_skills" (Kỹ năng).
- Hướng dẫn AI Agent (Orchestrator) tìm kiếm \`ai_skills\` để đọc các bước cần làm. Orchestrator có khả năng tự động thực hiện liên tiếp các công cụ (auto_next) nếu có Text Skill hướng dẫn.
- Nếu task liên quan đến "tạo nhân vật", "brand character", "seeding", hãy ưu tiên CHỌN THÊM tool \`query_ai_knowledge_base\` để Agent có thể tự tra cứu thông tin đối tượng khách hàng mục tiêu (\`marketing_persona\`).
- Nếu yêu cầu liên quan đến tạo Workflow (Marketing/Chatbot), hãy đảm bảo chọn tool \`query_ai_knowledge_base\` với danh mục \`marketing_workflow_node_descriptions\` để Orchestrator có thể tra cứu Cẩm nang cấu hình các Node.
- Nếu yêu cầu liên quan đến việc xem báo cáo, quản lý tài khoản, lịch trình, dashboard hoặc tra cứu dữ liệu phần mềm Marketing, hãy CHỌN tool \`query_ai_knowledge_base\` với danh mục \`marketing_usage_guide\` để Orchestrator biết cách dùng hệ thống.
- Nếu thông tin Khách hàng mục tiêu (Target Audience) hoặc Mục tiêu truyền thông (Media Goals) ĐANG TRỐNG ("CHƯA CUNG CẤP") và User yêu cầu lập kế hoạch/workflow Marketing, HÃY ƯU TIÊN yêu cầu user cập nhật thông tin này TRƯỚC khi tiến hành các Node Workflow. Dùng tool cập nhật business info (nếu có) hoặc thông báo ASK_USER.

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

      // --- PHASE 3: ORCHESTRATOR AGENT (SLOT FILLING & AUTO-EXECUTION LOOP) ---
      let loopCount = 0;
      const MAX_LOOPS = 5;
      let isDone = false;
      let lastToolResultStr = '';

      while (loopCount < MAX_LOOPS && !isDone) {
        loopCount++;

        sendSSE('progress', {
          message: `Đang đối chiếu dữ liệu để chuẩn bị thực thi (Bước ${loopCount})...`,
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

${lastToolResultStr ? `[KẾT QUẢ TỪ TOOL VỪA THỰC THI GẦN NHẤT]:\n${lastToolResultStr}\n\n` : ''}

CÁCH TRẢ VỀ KẾT QUẢ: Bắt buộc trả về duy nhất JSON:
\`\`\`json
{
  "decision": "EXECUTE_TOOL" | "ASK_USER" | "FINISHED",
  "tool_name": "tên_công_cụ_nếu_chọn_EXECUTE",
  "tool_payload": {},
  "auto_next": true_hoặc_false,
  "working_memory": {
    "dag_stack": "Cập nhật lại trạng thái các bước đã làm"
  },
  "reply": "Văn bản Markdown để hỏi/báo cáo người dùng (chỉ điền nếu ASK_USER hoặc FINISHED)"
}
\`\`\`

LUẬT CẤM KỴ (SLOT-FILLING - RẤT QUAN TRỌNG): 
- TUYỆT ĐỐI KHÔNG TỰ BỊA RA DỮ LIỆU ĐỂ GỌI TOOL.
- QUY TẮC TEXT SKILL (SKILL TEXT): Nếu người dùng yêu cầu thực hiện Playbook/Skill Text (ví dụ: Thiết lập seeding):
  + Hãy tra cứu Skill bằng Tool \`query_ai_knowledge_base\` nếu bạn chưa biết cách làm.
  + Trước khi cấu hình Marketing Workflow (\`marketing_create_workflow\`), NẾU BẠN KHÔNG CHẮC CHẮN về tham số, PHẢI gọi tool \`query_ai_knowledge_base\` với category \`marketing_workflow_node_descriptions\` để đọc Cấu hình chuẩn của Node đó.
  + Khi cấu hình Chatbot hoặc tạo mới kịch bản Chatbot, nếu không rõ cách map tham số JSON (personality, tone, rules...), hãy gọi tool \`query_ai_knowledge_base\` với category \`chatbot_configuration_guide\` để tham chiếu.
  + Khi tạo Nhân vật Brandlabs hoặc Prompt Template, nếu không rõ cách viết thẻ định dạng Tags (Key::Value), hãy gọi tool \`query_ai_knowledge_base\` với category \`brandlabs_usage_guide\` để tham chiếu.
  + Nếu bạn đã tra cứu được \`ai_skills\` hoặc tài liệu liên quan (hoặc đã có trong bộ nhớ / context): Hãy đọc và làm TUẦN TỰ từng bước.
  + Sau khi hoàn thành một công cụ, CẬP NHẬT \`working_memory.dag_stack\` và GÁN \`"auto_next": true\` ĐỂ TIẾP TỤC BƯỚC SAU NGAY LẬP TỨC mà không cần dừng lại hỏi User (Loop tự động).
  + NẾU người dùng CÓ ĐÍNH KÈM ẢNH (asset_id), HÀY SỬ DỤNG \`asset_id\` ĐÓ cho trường \`avatar_asset_id\`.
- Trong trường hợp thiếu dữ liệu bắt buộc KHÔNG THỂ TỰ TÌM (vd: ID tài khoản, Ngành hàng, Target Audience), bạn PHẢI chọn \`ASK_USER\` và đặt câu hỏi rõ ràng.
- NẾU TẤT CẢ CÁC BƯỚC ĐÃ XONG, chọn \`FINISHED\` và trả về \`reply\` là báo cáo tổng kết.

=== LỊCH SỬ TRÒ CHUYỆN ===
${historyText || 'Chưa có lịch sử.'}
==========================

[USER'S CURRENT REQUEST]: ${messageWithAttachments}
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
          workingMemoryStr = JSON.stringify(decisionData.working_memory);
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
          isDone = true;
        } else if (decisionData.decision === 'ASK_USER') {
          // --- PHASE 2A: ASK USER (SLOT FILLING) ---
          finalReply =
            decisionData.reply || 'Để tôi hỗ trợ bạn tốt nhất, vui lòng cung cấp thêm thông tin.';
          isDone = true;
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
          } else if (toolName === 'update_business_info') {
            try {
              const bizUpdateRes = await fetch(`${BUSINESS_CRM_URL}/api/business`, {
                method: 'PATCH',
                headers: {
                  authorization: authHeader,
                  'Content-Type': 'application/json',
                  'x-business-id': businessId,
                } as any,
                body: JSON.stringify(toolArgs),
              });
              if (bizUpdateRes.ok) {
                const updatedData = await bizUpdateRes.json();
                toolResult = {
                  success: true,
                  message: 'Business info updated successfully.',
                  data: updatedData,
                };
              } else {
                const errData = await bizUpdateRes.text();
                toolResult = { error: `Failed to update business info: ${errData}` };
              }
            } catch (err: any) {
              toolResult = { error: err.message || 'Error calling business CRM' };
            }
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

          lastToolResultStr = JSON.stringify(toolResult);

          if (!decisionData.auto_next) {
            // --- PHASE 3: SUMMARIZER AGENT ---
            sendSSE('progress', { message: 'Đang tổng hợp kết quả để báo cáo cho bạn...' });
            const summarizerPrompt = `[SYSTEM]: Bạn là Trợ lý ảo BizTada. Bạn vừa gọi API và nhận được kết quả.
Nhiệm vụ của bạn:
1. Trả lời TRỰC TIẾP vào trọng tâm câu hỏi của người dùng. KHÔNG dài dòng, KHÔNG chào hỏi (như "Kính gửi Anh/Chị"), KHÔNG đóng vai phòng ban nào cả.
2. NẾU kết quả là mảng danh sách, BẮT BUỘC phải dùng định dạng bảng Markdown (Markdown Table) chuẩn xác (ví dụ có \`|\` và \`---\` ngăn cách các cột) hoặc gạch đầu dòng (Bullet List). Tuyệt đối không in text phẳng liên tiếp gây rối mắt.
3. Không để lộ mã code hay raw JSON cho user.
4. Nếu kết quả API báo "error", giải thích ngắn gọn lỗi và cách khắc phục.

[KẾT QUẢ API]: ${lastToolResultStr}
[CÂU HỎI BAN ĐẦU CỦA USER]: ${message}`;

            finalReply = await generateAssistantText(summarizerPrompt);
            isDone = true;
          }
        } else if (decisionData.decision === 'FINISHED') {
          finalReply = decisionData.reply || 'Đã hoàn tất các bước.';
          isDone = true;
        } else {
          // --- PHASE 2C: CHAT ---
          finalReply = decisionData.reply || orchestratorResponse;
          isDone = true;
        }
      } // end while loop
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
