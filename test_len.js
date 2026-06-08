const url = 'https://svc-biztada-crm.tadagram.com/assistant/chat';
const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzI3YmJjN2QtNjc1Ny00MWJjLWE4ZmMtZDM2NDNkMzk1ZWJmIiwidGVsZWdyYW1faWQiOjY0NjE1NDExNzksInNlc3Npb25faWQiOiI4NmY4ODY4Ny00NjhhLTQ5ZjItOTcyYi0yZGZhMGM1NjlkNWIiLCJpc3MiOiJ0YWRhZ3JhbS1jb3JlLWFwaSIsImlhdCI6MTc4MDg4NTQ0NSwiZXhwIjoxNzgwODg5MDQ1fQ.K2rNq5w-o2Cbn7hm79ZKnjDCGOkmUg3gUlt0njpJ6gk';
async function run() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': token, 'x-business-id': '52e03e27-d64b-48dd-a4ec-e6e763934187', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Tạo cho tôi một nhân vật AI tên là Tony, nam giới, 25 tuổi, phong cách lịch lãm để làm KOL.' })
  });
  const text = await res.text();
  console.log('LENGTH:', text.length);
  console.log('END:', text.substring(text.length - 200));
}
run();
