require('dotenv').config({ path: '.env.dev' });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('Đang đọc file marketing_nodes_guide.md...');
  const filePath = path.join(__dirname, 'docs', 'marketing_nodes_guide.md');
  const markdownContent = fs.readFileSync(filePath, 'utf-8');

  const category = 'ai_skill_instructions';
  const title = 'marketing_nodes_config_guide';
  const keywords = ['marketing nodes', 'cấu hình', 'workflow', 'add_to_seeding_contents', 'image_source_type', 'dispatch_mode'];

  console.log(`Đang xoá bản ghi cũ của ${title}...`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM ai_knowledge_base WHERE category = ? AND title = ?`,
    category,
    title
  );

  console.log(`Đang chèn bản ghi mới cho ${title}...`);
  const id = crypto.randomUUID();
  
  // Lưu content dạng string markdown (được gói trong object để khớp cấu trúc hiện tại nếu cần, hoặc lưu thẳng string)
  // Trong DB, content là JSON. Ta lưu một object có chứa text markdown.
  const contentObj = {
    instruction_type: "markdown",
    text: markdownContent
  };

  await prisma.$executeRawUnsafe(
    `INSERT INTO ai_knowledge_base (id, category, title, content, keywords) VALUES (?, ?, ?, ?, ?)`,
    id,
    category,
    title,
    JSON.stringify(contentObj),
    JSON.stringify(keywords)
  );

  console.log('✅ Cập nhật Cẩm nang Marketing Nodes thành công!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
