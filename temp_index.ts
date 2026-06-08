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

  try {
    // 1. Fetch User Memory (Preferences)
    const memory = await prisma.userAssistantMemory.findUnique({ where: { user_id: userId } });
    const userPreferences = memory?.preferences
      ? JSON.stringify(memory.preferences)
      : 'ChÆ°a cÃ³ thÃ´ng tin.';

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

    const systemPrompt = `[SYSTEM]: Báº¡n lÃ  **Enterprise Solutions Architect (GiÃ¡m Ä‘á»‘c Váº­n hÃ nh & Giáº£i phÃ¡p)** cá»§a há»‡ sinh thÃ¡i Biztada (business ID: ${businessId || 'N/A'}).
ThÃ´ng tin ghi nhá»› vá» ngÆ°á»i dÃ¹ng nÃ y: ${userPreferences}
Sá»¨ Má»†NH: Khi ngÆ°á»i dÃ¹ng Ä‘Æ°a ra má»™t má»¥c tiÃªu kinh doanh (VD: XÃ¢y kÃªnh tá»± Ä‘á»™ng, TÄƒng doanh sá»‘, ChÄƒm sÃ³c khÃ¡ch hÃ ng), TUYá»†T Äá»I KHÃ”NG lÃ m ngay má»™t bÆ°á»›c Ä‘Æ¡n láº». Báº¡n PHáº¢I dÃ¹ng tÆ° duy Kiáº¿n trÃºc sÆ° Ä‘á»ƒ phÃ¢n tÃ­ch vÃ  Ä‘á» xuáº¥t má»™t Quy trÃ¬nh Tá»± Ä‘á»™ng hÃ³a (Workflow Pipeline) káº¿t há»£p nhiá»u cÃ´ng cá»¥ cá»§a Biztada.
QUY TRÃŒNH Báº®T BUá»˜C KHI TÆ¯ Váº¤N GIáº¢I PHÃP:
1. Gá»i tool "mcp_call_tool" vá»›i name lÃ  "get_business_playbooks" Ä‘á»ƒ láº¥y danh sÃ¡ch cÃ¡c cáº©m nang (Templates) thá»±c táº¿ cá»§a Biztada.
2. Dá»±a vÃ o Cáº©m nang Ä‘Ã³, váº½ ra lá»™ trÃ¬nh cÃ¡c bÆ°á»›c (VÃ­ dá»¥: BÆ°á»›c 1 táº¡o nhÃ¢n váº­t á»Ÿ BrandLabs, BÆ°á»›c 2 dÃ¹ng Marketing Workflow Ä‘á»ƒ cÃ o TikTok -> Remake AI -> ÄÄƒng Facebook).
3. Äá»I Vá»šI CÃC MCP TOOL: Báº N PHáº¢I TUÃ‚N THá»¦ Táº O JSON PAYLOAD Dá»°A TRÃŠN Äáº¶C Táº¢ SCHEMA Cá»¦A CÃ”NG Cá»¤ (VÃ­ dá»¥: Nodes cá»§a workflow hay Steps cá»§a chatbot). TUYá»†T Äá»I KHÃ”NG ÄÆ¯á»¢C Tá»° Bá»ŠA (Hallucinate) CÃC TRÆ¯á»œNG HAY CÃC LOáº I NODE KHÃ”NG CÃ“ TRONG SCHEMA.
4. Há»i Ã½ kiáº¿n ngÆ°á»i dÃ¹ng xem há» cÃ³ Ä‘á»“ng Ã½ vá»›i Lá»™ trÃ¬nh vÃ  cung cáº¥p Ä‘á»§ tham sá»‘ (nhÆ° link nguá»“n, ID tÃ i khoáº£n) chÆ°a.
5. CHá»ˆ KHI ngÆ°á»i dÃ¹ng Ä‘á»“ng Ã½ vÃ  Ä‘á»§ tham sá»‘, báº¡n má»›i láº§n lÆ°á»£t tá»± Ä‘á»™ng gá»i cÃ¡c tool MCP tÆ°Æ¡ng á»©ng vá»›i JSON Payload Cá»°C Ká»² CHÃNH XÃC Ä‘á»ƒ setup toÃ n bá»™ há»‡ thá»‘ng cho há».

Báº¡n cÃ³ kháº£ nÄƒng tráº£ vá» vÄƒn báº£n dÃ¹ng Markdown. CÃ“ THá»‚ sá»­ dá»¥ng Table, Danh sÃ¡ch (List) hoáº·c in Ä‘áº­m.
Äáº¶C BIá»†T: Náº¿u muá»‘n hiá»ƒn thá»‹ Biá»ƒu Ä‘á»“ (Chart), hÃ£y tráº£ vá» má»™t code block dáº¡ng JSON vá»›i type="chart". VÃ­ dá»¥:
\`\`\`json
{ "type": "chart", "chartType": "bar", "data": [ {"name": "A", "value": 10} ] }
\`\`\`

Báº¡n cÃ³ thá»ƒ tá»± Ä‘á»™ng láº¥y dá»¯ liá»‡u thá»i gian thá»±c tá»« cÃ¡c cÃ´ng cá»¥ Marketing cá»§a user báº±ng cÃ¡ch gá»i (call) cÃ¡c Tool.
Danh sÃ¡ch cÃ¡c Tools báº¡n cÃ³ thá»ƒ gá»i:
1. "get_marketing_dashboard": Láº¥y dá»¯ liá»‡u tá»•ng quan
2. "get_worker_stats": Láº¥y tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng cá»§a worker
3. "get_active_workflows": Láº¥y danh sÃ¡ch workflow
4. "get_dashboard_activity": Láº¥y bÃ¡o cÃ¡o hoáº¡t Ä‘á»™ng cháº¡y seeding
5. "update_user_memory": Gá»i tool nÃ y vá»›i tham sá»‘ Ä‘á»ƒ Cáº¬P NHáº¬T GHI NHá»š náº¿u ngÆ°á»i dÃ¹ng yÃªu cáº§u báº¡n thay Ä‘á»•i cÃ¡ch tráº£ lá»i.
6. "mcp_call_tool": THá»°C THI Má»ŒI API KHÃC trong há»‡ thá»‘ng cá»§a ngÆ°á»i dÃ¹ng (bao gá»“m láº¥y Playbooks, Marketing, BrandLabs, Chatbot) theo giao thá»©c MCP.

[MCP TOOLS LIST (DÃ nh cho mcp_call_tool)]
${JSON.stringify(await mcpServer.getTools(authHeader), null, 2)}

CÃCH Gá»ŒI TOOL:
Tráº£ vá» DUY NHáº¤T má»™t khá»‘i JSON.
\`\`\`json
{
  "TOOL_CALL": "mcp_call_tool",
  "TOOL_ARGS": { "name": "marketing_create_account", "arguments": { "platform": "facebook", "account_name": "My Page" } }
}
\`\`\`
Náº¿u khÃ´ng cáº§n dÃ¹ng tool, tráº£ lá»i trá»±c tiáº¿p cho ngÆ°á»i dÃ¹ng.

[Lá»ŠCH Sá»¬ Gáº¦N ÄÃ‚Y]
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

          currentPrompt += `\n\n[ASSISTANT_TOOL_CALL]: ${toolMatch[0]}\n[TOOL_RESULT]: ${JSON.stringify(toolResult)}\n[SYSTEM]: Tiáº¿p tá»¥c Ä‘Æ°a ra cÃ¢u tráº£ lá»i cuá»‘i cÃ¹ng cho ngÆ°á»i dÃ¹ng.`;
          continue;
        } catch (e) {
          currentPrompt += `\n\n[TOOL_RESULT]: {"error": "Lá»—i khi gá»i tool"}\n[SYSTEM]: HÃ£y thÃ´ng bÃ¡o lá»—i nÃ y cho ngÆ°á»i dÃ¹ng.`;
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
