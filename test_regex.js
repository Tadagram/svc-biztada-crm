const replyText = 'Chào bạn, tôi sẽ giúp bạn. \n```json\n{\n  "action": "create",\n  "data": 123\n}\n```\nĐây là câu trả lời.';
let finalReply = replyText;
const actionPayloads = [];
const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
let match;
while ((match = jsonRegex.exec(replyText)) !== null) {
  try {
    const parsed = JSON.parse(match[1]);
    actionPayloads.push(parsed);
    finalReply = finalReply.replace(match[0], '').trim();
  } catch (e) {
    console.log('Error parsing JSON:', e);
  }
}
console.log('actionPayloads:', actionPayloads);
console.log('finalReply:', finalReply);
