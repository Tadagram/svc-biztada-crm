

const url = 'https://svc-biztada-crm.tadagram.com/assistant/chat';
const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzI3YmJjN2QtNjc1Ny00MWJjLWE4ZmMtZDM2NDNkMzk1ZWJmIiwidGVsZWdyYW1faWQiOjY0NjE1NDExNzksInNlc3Npb25faWQiOiI4NmY4ODY4Ny00NjhhLTQ5ZjItOTcyYi0yZGZhMGM1NjlkNWIiLCJpc3MiOiJ0YWRhZ3JhbS1jb3JlLWFwaSIsImV4cCI6MTc4MDc5ODA4MCwiaWF0IjoxNzgwNzk0NDgwfQ.8Lv_y-AJM6G2-7vh-KtTcsRySkelmKb-N_Bk3j7lGCA';
const businessId = '52e03e27-d64b-48dd-a4ec-e6e763934187';

async function testLive() {
  console.log('Testing LIVE endpoint: ' + url);
  console.log('Sending message to test Marketing Workflow MCP...');
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'x-business-id': businessId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Tạo cho tôi một workflow tự động: Cào danh sách group về, sau đó comment vào bài viết.' })
    });
    
    const text = await res.text();
    console.log('Response Status:', res.status);
    console.log('Response Body:\n', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testLive();
