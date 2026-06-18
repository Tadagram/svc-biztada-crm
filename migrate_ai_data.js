require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');

// Get credentials from environment variables
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("Missing MONGO_URL in environment.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration...");
  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  const db = mongoClient.db("tadagram_ai");
  const capsCol = db.collection("strategy_api_capabilities");
  const chunksCol = db.collection("strategy_knowledge_chunks");

  // 1. Migrate AiMcpTools
  const tools = await prisma.aiMcpTools.findMany();
  console.log(`Found ${tools.length} AiMcpTools`);
  for (const t of tools) {
    const existing = await capsCol.findOne({ capability_id: t.name });
    if (!existing) {
      await capsCol.insertOne({
        capability_id: t.name,
        name: t.name,
        display_name: t.display_name || t.name,
        description: t.description,
        service: t.service,
        action_type: t.action_type,
        http_method: t.http_method,
        endpoint: t.endpoint,
        parameter_schema: typeof t.parameter_schema === 'string' ? JSON.parse(t.parameter_schema) : t.parameter_schema,
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at
      });
      console.log(`Inserted Capability: ${t.name}`);
    } else {
      console.log(`Capability ${t.name} already exists. Skipping.`);
    }
  }

  // 2. Migrate AiKnowledgeBase
  const kbs = await prisma.aiKnowledgeBase.findMany();
  console.log(`Found ${kbs.length} AiKnowledgeBase`);
  for (const k of kbs) {
    const existing = await chunksCol.findOne({ title: k.title });
    if (!existing) {
      await chunksCol.insertOne({
        title: k.title,
        content: JSON.stringify(k.content),
        summary: k.title,
        category: k.category,
        content_type: "document",
        tags: k.keywords ? (typeof k.keywords === 'string' ? JSON.parse(k.keywords) : k.keywords) : [],
        is_active: k.is_active,
        created_at: k.created_at,
        updated_at: k.updated_at
      });
      console.log(`Inserted Knowledge Chunk: ${k.title}`);
    } else {
      console.log(`Knowledge Chunk ${k.title} already exists. Skipping.`);
    }
  }

  // 3. Migrate AiBusinessPlaybooks
  const playbooks = await prisma.aiBusinessPlaybooks.findMany();
  console.log(`Found ${playbooks.length} AiBusinessPlaybooks`);
  for (const p of playbooks) {
    const existing = await chunksCol.findOne({ title: p.name });
    if (!existing) {
      await chunksCol.insertOne({
        title: p.name,
        content: JSON.stringify(p.steps),
        summary: p.description || p.name,
        category: "playbook",
        content_type: "playbook",
        is_active: p.is_active,
        created_at: p.created_at,
        updated_at: p.updated_at
      });
      console.log(`Inserted Playbook Chunk: ${p.name}`);
    } else {
      console.log(`Playbook Chunk ${p.name} already exists. Skipping.`);
    }
  }

  await mongoClient.close();
  await prisma.$disconnect();
  console.log("Migration finished.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
