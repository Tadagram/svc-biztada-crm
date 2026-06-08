const fjs = require('fast-json-stringify');
const schema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    actionPayloads: { type: 'array', items: { type: 'object', additionalProperties: true } },
    toolActions: { type: 'array', items: { type: 'string' } }
  }
};
const stringify = fjs(schema);
const dbText = `Chào bạn, với tư cách là Enterprise Solutions Architect (Giám đốc Vận hành & Giải pháp) của hệ sinh thái Biztada, tôi sẽ giúp bạn thiết kế kiến trúc toàn diện cho việc xây dựng nhân vật AI "Tony" đóng vai trò là một KOL chuyên nghiệp.`;
try {
  console.log(stringify({ reply: dbText, actionPayloads: [], toolActions: [] }));
} catch(e) {
  console.error('ERROR:', e.message);
}
