import { getMcpToolsRegistry } from '../src/mcp/registry';

const authHeader =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzI3YmJjN2QtNjc1Ny00MWJjLWE4ZmMtZDM2NDNkMzk1ZWJmIiwidGVsZWdyYW1faWQiOjY0NjE1NDExNzksInNlc3Npb25faWQiOiI4NmY4ODY4Ny00NjhhLTQ5ZjItOTcyYi0yZGZhMGM1NjlkNWIiLCJpc3MiOiJ0YWRhZ3JhbS1jb3JlLWFwaSIsImV4cCI6MTc4MDc5ODA4MCwiaWF0IjoxNzgwNzk0NDgwfQ.8Lv_y-AJM6G2-7vh-KtTcsRySkelmKb-N_Bk3j7lGCA';

async function testDynamicSchema() {
  console.log('Fetching dynamic schema using user token...');
  const registry = await getMcpToolsRegistry(authHeader);

  const workflowTool = registry.find((t) => t.name === 'marketing_create_workflow');
  if (workflowTool && workflowTool.inputSchema.properties.nodes) {
    const nodesInfo = (workflowTool.inputSchema.properties.nodes as any).items.oneOf;
    console.log(`Successfully fetched ${nodesInfo.length} dynamic nodes!`);
    console.log('Sample node (1st):', JSON.stringify(nodesInfo[0], null, 2));
  } else {
    console.error('marketing_create_workflow tool or its nodes property not found in registry');
  }
}

testDynamicSchema().catch(console.error);
