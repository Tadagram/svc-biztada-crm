const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Comprehensive Campaign Strategy as Text Skill...');

  // 1. Seed Knowledge Base (Strategy Proposal & Text Skill)
  const knowledgeData = {
    category: 'marketing_campaign_blueprints',
    title: 'Chiến Dịch Seeding Toàn Diện (5 Bước)',
    keywords: ['seeding', 'group', 'fanpage', 'profile', 'brandlabs', 'marketing_workflow'],
    content: {
      description: 'Chiến dịch tổng thể kết hợp Brandlabs và Marketing Workflows để bao phủ tương tác trên các kênh Facebook (Group, Fanpage, Profile).',
      rationale: 'Chiến dịch này tự động hóa việc tìm kiếm nhóm, tương tác mồi, tạo nội dung viral, và kết bạn profile để tạo độ uy tín cho nhân vật thương hiệu.',
      trigger_intent: 'Tự động thiết lập khi người dùng yêu cầu kịch bản seeding toàn diện hoặc chiến dịch marketing 5 bước.',
      ai_skill_instructions: `
[THÔNG TIN CHIẾN DỊCH SEEDING TOÀN DIỆN]
Đây là kịch bản (Text Skill) hướng dẫn AI Agent thiết lập chiến dịch seeding.

YÊU CẦU DỮ LIỆU ĐẦU VÀO (Hãy kiểm tra và hỏi người dùng nếu thiếu):
1. Ngành hàng (industry)
2. Khách hàng mục tiêu (target_audience)

CÁC BƯỚC THỰC THI (Tuần tự):
**Bước 1: Tạo nhân vật thương hiệu**
- Dùng tool: \`brandlabs_create_brand_character\`
- Tham số: 
  + name: "Chuyên gia [Ngành hàng]"
  + style: Tự động dùng tool \`query_ai_knowledge_base\` để sinh nội dung phong cách cho nhân vật dựa theo target_audience.
  (Lưu ID của character này vào working_memory để dùng cho các bước sau)

**Bước 2: Workflow Tham gia Nhóm (Join Group)**
- Dùng tool: \`marketing_create_workflow\`
- Tham số:
  + task_type: "facebook_group_join"
  + character_id: ID từ Bước 1
  + keywords: Tự động sinh từ target_audience
  + schedule: "0 8 * * 1,3,5"

**Bước 3: Workflow Tương tác Nhóm (Post & Reply)**
- Dùng tool: \`marketing_create_workflow\`
- Tham số:
  + task_type: "facebook_group_post_reply"
  + character_id: ID từ Bước 1
  + source_content: Tự động sinh nội dung mồi thu hút
  + schedule: "0 9 * * *"

**Bước 4: Workflow Fanpage Bán Hàng & Cộng Đồng**
- Gọi tool \`marketing_create_workflow\` 2 lần liên tiếp:
  Lần 1: task_type="facebook_fanpage_post", remake_strategy="product_promotion", schedule="0 10 * * *"
  Lần 2: task_type="facebook_fanpage_community", remake_strategy="viral_content", schedule="0 11 * * *"

**Bước 5: Workflow Quét Profile & Kết bạn**
- Dùng tool: \`marketing_create_workflow\`
- Tham số:
  + task_type: "facebook_profile_farming"
  + character_id: ID từ Bước 1
  + scan_source: "viral_posts"
  + schedule: "0 12 * * *"

LUẬT QUAN TRỌNG: 
- Sau khi hoàn thành MỘT bước, hãy ghi chú vào \`working_memory.dag_stack\` trạng thái completed, và chuyển sang bước tiếp theo.
- NẾU người dùng cung cấp thiếu Ngành hàng / Target Audience, hãy DỪNG LẠI và hỏi họ (ASK_USER).
      `.trim()
    }
  };

  // Upsert AiKnowledgeBase
  const existingKb = await prisma.aiKnowledgeBase.findFirst({
    where: { title: knowledgeData.title }
  });

  if (existingKb) {
    await prisma.aiKnowledgeBase.update({
      where: { id: existingKb.id },
      data: {
        category: knowledgeData.category,
        content: knowledgeData.content,
        keywords: knowledgeData.keywords
      }
    });
    console.log('Updated AiKnowledgeBase:', knowledgeData.title);
  } else {
    await prisma.aiKnowledgeBase.create({
      data: knowledgeData
    });
    console.log('Created AiKnowledgeBase:', knowledgeData.title);
  }

  // NOTE: AiBusinessPlaybooks JSON DAG has been permanently removed!
  // The Orchestrator will now read \`ai_skill_instructions\` from AiKnowledgeBase directly.
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
