import { FastifyReply, FastifyRequest } from 'fastify';

interface DirectionQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategyDirectionRow {
  strategy_direction_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  businessSummary: {
    name: 'Phú Hòa Fresh',
    industry: 'Kinh doanh trái cây tươi & thực phẩm sạch',
    location: 'Bình Dương — Thủ Dầu Một',
    stage: 'Mở rộng cộng đồng địa phương — hướng tới hệ thống hóa vận hành bán hàng',
  },
  strategicNorth: {
    headline:
      'Xây dựng hệ thống Sale & Marketing tự vận hành — không phụ thuộc vào cá nhân, có thể nhân bản và mở rộng quy mô.',
    rationale:
      'Thay vì quản lý từng hoạt động thủ công, BizTada tích hợp 5 module tạo thành chu kỳ khép kín: content được sản xuất tự động → khuếch đại organic → chuyển đổi thành data → nuôi dưỡng đến chốt đơn → giữ chân và tái kích hoạt. Concept này là nền tảng để phân bổ mọi hoạt động chi tiết tiếp theo.',
  },
  funnelPhases: [
    {
      id: 'ph1-content-engine',
      phaseId: 1,
      icon: '🎨',
      title: 'Content & Brand Engine',
      description:
        'Xây dựng "nhà máy nội dung" thông minh vận hành bằng AI. BrandLabs không chỉ sản xuất nội dung — nó định hình ngôn ngữ thương hiệu, học từ insight thị trường và liên tục tối ưu theo phản hồi. Đây là nền tảng để toàn bộ hệ thống có "nguyên liệu" để vận hành.',
      tools: ['BrandLabs AI', 'Auto-Publishing', 'Brand Persona'],
      measurable:
        'Tạo ra luồng nội dung liên tục để nuôi toàn bộ chu kỳ — không có content, các module tiếp theo không có gì để khuếch đại hay chuyển đổi.',
      color: 'emerald',
    },
    {
      id: 'ph2-amplification',
      phaseId: 2,
      icon: '🌐',
      title: 'Social Amplification Network',
      description:
        'Khuếch đại nội dung thông qua mạng lưới được điều phối chiến lược. Matrix Seeding mô phỏng hành vi xã hội tự nhiên, tạo social proof và kích hoạt thuật toán để nội dung tiếp cận đúng nhóm đối tượng mục tiêu — không đơn thuần là "seeding bài".',
      tools: ['Matrix Seeding', 'Porter Network', 'Demographic Targeting'],
      measurable:
        'Khuếch đại content từ Module 1 để tạo traffic và social proof — đưa đúng người vào đúng điểm tiếp xúc để Module 3 có thể chuyển đổi.',
      color: 'cyan',
    },
    {
      id: 'ph3-conversion-gateway',
      phaseId: 3,
      icon: '🤖',
      title: 'AI Conversion Gateway',
      description:
        'Biến điểm tiếp xúc thành cơ hội chuyển đổi. AI Chatbot không chỉ trả lời tin nhắn — nó phân tích ý định, dẫn dắt cuộc hội thoại theo kịch bản đã được thiết kế và chuyển đổi sự tò mò thành hành động. Đây là điểm giao thoa giữa "traffic" và "data khách hàng."',
      tools: ['AI Chatbot', 'Intent Recognition', 'Multi-channel Integration'],
      measurable:
        'Chuyển traffic từ Module 2 thành data khách hàng có cấu trúc — đầu ra của module này là leads sạch, sẵn sàng đưa vào pipeline bán hàng ở Module 4.',
      color: 'amber',
    },
    {
      id: 'ph4-pipeline-engine',
      phaseId: 4,
      icon: '🔗',
      title: 'Pipeline & Closing Engine',
      description:
        'Quản lý toàn bộ hành trình từ lead đến giao dịch bằng quy trình hệ thống. CRM phân loại, ưu tiên và kích hoạt kịch bản chăm sóc phù hợp với từng giai đoạn — không phụ thuộc vào phán đoán cá nhân hay kỹ năng sales thủ công.',
      tools: ['CRM Pipeline', 'ZNS Automation', 'Sales Workflow'],
      measurable:
        'Xử lý leads từ Module 3 theo quy trình chuẩn hóa — nuôi dưỡng, phân loại và chốt đơn; đầu ra là khách hàng đã giao dịch chuyển sang Module 5 để giữ chân.',
      color: 'violet',
    },
    {
      id: 'ph5-growth-loop',
      phaseId: 5,
      icon: '♾️',
      title: 'Loyalty & Growth Loop',
      description:
        'Biến khách hàng thành tài sản chiến lược dài hạn. Module Retention không chỉ giữ chân — nó tạo vòng lặp tăng trưởng tự nhiên: khách hàng hài lòng → tái mua → giới thiệu → khách hàng mới. Đây là cơ chế làm cho toàn bộ chu kỳ 5 module trở nên bền vững.',
      tools: ['Broadcast Automation', 'Loyalty Tagging', 'Re-marketing'],
      measurable:
        'Giữ chân và tái kích hoạt khách hàng từ Module 4 — tạo vòng lặp khép kín khi khách hàng cũ quay lại đầu phễu và trở thành nguồn acquisition tự nhiên cho chu kỳ mới.',
      color: 'rose',
    },
  ],
  implementationLogic:
    'Chu kỳ 5 module vận hành liên tục và khép kín: Module 1 tạo nguyên liệu → Module 2 khuếch đại phạm vi → Module 3 chuyển đổi thành data → Module 4 đưa data thành doanh thu → Module 5 giữ chân và tái khởi động chu kỳ. Concept này là nền tảng để từ đó phân bổ chi tiết hoạt động, chủ đề nội dung và kênh truyền thông.',
  keyAssumptions: [
    'Zalo OA, Fanpage và các kênh đã được kết nối vào hệ thống BizTada',
    'Kịch bản Seeding, Knowledge Base Chatbot và Brand Persona được khởi tạo trước khi vận hành',
    'Mỗi module cần được cấu hình đồng bộ để data chạy xuyên suốt từ Marketing → Chatbot → CRM',
  ],
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Querystring: DirectionQuery }>,
  reply: FastifyReply,
) {
  const { guestId, businessId, userId } = request.query;
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(guestId);
  const effectiveUserId = authUserId ?? sanitizeId(userId);
  const effectiveBusinessId = sanitizeId(businessId) ?? 'demo';

  let source: SourceType = 'demo';
  let rows: StrategyDirectionRow[] = [];

  if (effectiveGuestId) {
    rows = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_direction
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'guest';
  } else if (effectiveUserId) {
    rows = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_direction
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'user';
  } else if (effectiveBusinessId !== 'demo') {
    rows = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_direction
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'business';
  }

  if (rows.length > 0) {
    const row = rows[0];
    return reply.send({
      success: true,
      data: row.payload,
      meta: {
        source,
        id: row.strategy_direction_id,
        businessId: row.business_id,
        userId: row.user_id,
        guestId: row.guest_id,
        isDemo: Boolean(row.is_demo),
        updatedAt: row.updated_at,
        usedFallbackDemo: false,
      },
    });
  }

  return reply.send({
    success: true,
    data: FALLBACK_DEMO_DATA,
    meta: {
      source: 'demo',
      id: null,
      businessId: effectiveBusinessId,
      userId: effectiveUserId,
      guestId: effectiveGuestId,
      isDemo: true,
      updatedAt: new Date().toISOString(),
      usedFallbackDemo: true,
    },
  });
}
