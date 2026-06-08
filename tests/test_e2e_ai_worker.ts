import { getMcpToolsRegistry } from '../src/mcp/registry';
import { generateAssistantText } from '../src/services/aiControllerClient';

const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzI3YmJjN2QtNjc1Ny00MWJjLWE4ZmMtZDM2NDNkMzk1ZWJmIiwidGVsZWdyYW1faWQiOjY0NjE1NDExNzksInNlc3Npb25faWQiOiI4NmY4ODY4Ny00NjhhLTQ5ZjItOTcyYi0yZGZhMGM1NjlkNWIiLCJpc3MiOiJ0YWRhZ3JhbS1jb3JlLWFwaSIsImV4cCI6MTc4MDc5ODA4MCwiaWF0IjoxNzgwNzk0NDgwfQ.8Lv_y-AJM6G2-7vh-KtTcsRySkelmKb-N_Bk3j7lGCA';
const userId = '727bbc7d-6757-41bc-a8fc-d3643d395ebf';


async function runE2EAITest() {
  console.log('[1] CRM Orchestrator: Fetching Dynamic Tools (46 Nodes) using user token...');
  const tools = await getMcpToolsRegistry(authHeader);
  console.log(`[1] CRM Orchestrator: Fetched ${tools.length} tools. Marketing workflow tool has dynamic nodes.`);

  console.log('[2] CRM Orchestrator: Building Massive Prompt...');
  const systemPrompt = `[SYSTEM]: Bạn là **Enterprise Solutions Architect** của hệ sinh thái Biztada.
SỨ MỆNH: Khi người dùng đưa ra mục tiêu, ĐỐI VỚI CÁC MCP TOOL: BẠN PHẢI TUÂN THỦ TẠO JSON PAYLOAD DỰA TRÊN ĐẶC TẢ SCHEMA CỦA CÔNG CỤ.

[MCP TOOLS LIST (Dành cho mcp_call_tool)]
${JSON.stringify(tools, null, 2)}

CÁCH GỌI TOOL:
Trả về DUY NHẤT một khối JSON.
\`\`\`json
{
  "TOOL_CALL": "mcp_call_tool",
  "TOOL_ARGS": { "name": "marketing_create_workflow", "arguments": { "workflow_name": "...", "nodes": [...] } }
}
\`\`\`
Nếu không cần dùng tool, trả lời trực tiếp.`;

  const userMessage = "Tạo cho tôi một workflow Marketing tự động: Cào danh sách group về, sau đó comment vào bài viết.";
  const prompt = `${systemPrompt}\n\n[USER]: ${userMessage}`;

  console.log('[3] CRM Orchestrator: Triggering wkr-ai-controller via generateAssistantText...');
  console.log('Sending prompt of length:', prompt.length);
  
  try {
    const aiResponse = await generateAssistantText(prompt, userId);
    console.log('\n[4] wkr-ai-controller (The Brain) Response:\n');
    console.log(aiResponse);

    const toolMatch = aiResponse.match(/```json\s*(\{[\s\S]*?"TOOL_CALL"[\s\S]*?\})\s*```/);
    if (toolMatch) {
      console.log('\n✅ CATCH: Móc được JSON Payload!');
      const payload = JSON.parse(toolMatch[1]);
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log('\n❌ FAILED: AI did not return a TOOL_CALL JSON block.');
    }
  } catch (err) {
    console.error('Error during AI execution:', err);
  }
}

runE2EAITest();
