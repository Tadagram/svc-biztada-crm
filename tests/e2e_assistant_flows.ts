const url = 'https://svc-biztada-crm.tadagram.com/assistant/chat';
const authHeader = process.env.AUTH_TOKEN || 'Bearer eyJhb...';
const businessId = '52e03e27-d64b-48dd-a4ec-e6e763934187';

const testCases = [
  {
    name: '🎯 Marketing Flow (Dynamic Nodes)',
    message:
      'Tạo cho tôi một workflow tự động: Cào danh sách group facebook về, sau đó comment vào bài viết.',
  },
  {
    name: '🎯 BrandLabs Flow',
    message:
      'Tạo cho tôi một nhân vật AI tên là Tony, nam giới, 25 tuổi, phong cách lịch lãm để làm KOL.',
  },
  {
    name: '🎯 Chatbot Flow',
    message:
      'Tạo một kịch bản chatbot tên là "Báo Giá", tự động trả lời văn bản "Xin chào" khi khách gửi tin nhắn chứa từ khóa báo giá.',
  },
];

async function runTests() {
  console.log('====================================================');
  console.log('🚀 BIZTADA ASSISTANT E2E FLOW TESTER');
  console.log('====================================================\n');

  for (const testCase of testCases) {
    console.log(`⏳ Đang test luồng: ${testCase.name}`);
    console.log(`   Prompt: "${testCase.message}"`);

    try {
      const startTime = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'x-business-id': businessId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testCase.message }),
      });

      const duration = Date.now() - startTime;
      const text = await res.text();

      if (res.status === 200) {
        console.log(`   ✅ SUCCESS (Status: 200, Time: ${duration}ms)`);
        const json = JSON.parse(text);
        console.log(`   🤖 AI Reply: ${json.reply}`);
        console.log(`   📦 Action Payloads: ${JSON.stringify(json.actionPayloads, null, 2)}`);
        console.log(`   🔧 Tools Used: ${JSON.stringify(json.toolActions)}`);
      } else {
        console.log(`   ❌ FAILED (Status: ${res.status})`);
        console.log(`   Response: ${text}`);
      }
    } catch (err: any) {
      console.log(`   ❌ ERROR: ${err.message}`);
    }
    console.log('----------------------------------------------------\n');
  }
}

runTests();
