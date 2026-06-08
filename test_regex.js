const text = `Chào bạn, với vai trò là Giám đốc Vận hành & Giải pháp...
Đổi với mục tiêu xử lý "Báo Giá"...

Để thiết kế một Workflow Pipeline chuẩn xác...

\`\`\`json
{
  "TOOL_CALL": "mcp_call_tool",
  "TOOL_ARGS": {
    "name": "get_business_playbooks",
    "arguments": {}
  }
}
\`\`\`
`;
const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
let match;
while ((match = jsonRegex.exec(text)) !== null) {
  console.log('MATCHED:', match[0]);
}
