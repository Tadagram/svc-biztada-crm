const url = 'https://svc-biztada-crm.tadagram.com/assistant/chat';
const authHeader = process.env.AUTH_TOKEN;
const businessId = '52e03e27-d64b-48dd-a4ec-e6e763934187';

async function run() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'x-business-id': businessId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Tạo cho tôi một nhân vật AI tên là Tony, nam giới, 25 tuổi, phong cách lịch lãm để làm KOL.' })
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('RAW TEXT ENDS WITH:', text.substring(text.length - 100));
}
run();
