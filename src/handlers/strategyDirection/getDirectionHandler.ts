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
    stage: 'Đang mở rộng thị phần trong bán kính 15km',
  },
  coreChallenge:
    'Cạnh tranh với chợ truyền thống và các sàn TMĐT lớn (Shopee/TikTok Shop) trong địa bàn hẹp, nhưng không có lợi thế về giá. Lợi thế thực sự nằm ở sự tin tưởng cộng đồng địa phương, tính tươi và giao nhanh — nhưng chưa được truyền thông hiệu quả.',
  strategicNorth: {
    headline:
      'Xây dựng thương hiệu cộng đồng địa phương tin cậy — không cạnh tranh giá, cạnh tranh bằng Trust + Tiện lợi + Cộng đồng.',
    rationale:
      'Thị trường Bình Dương có cộng đồng cư dân mới đang tìm nguồn thực phẩm đáng tin cậy ngoài chợ truyền thống. Sàn TMĐT có giá tốt nhưng không có nguồn gốc rõ ràng và không giao nhanh trong ngày. PHF có thể lấp đúng khoảng trống này bằng cách xây cộng đồng local trước, bán hàng sau.',
  },
  pillars: [
    {
      id: 'p-community',
      icon: '🏘️',
      title: 'Xây cộng đồng địa phương',
      what: 'Facebook Groups + Zalo OA là nền tảng chính — ưu tiên build community trước khi push sales',
      why: 'Người mua thực phẩm cần trust từ cộng đồng họ belong — không phải từ ads đơn thuần',
      measurable: '3 Facebook Group hoạt động, 1.000+ thành viên active trong 90 ngày',
      color: 'emerald',
      linkedSections: ['Action Plan Community', 'Vận hành Seeding & Porter'],
    },
    {
      id: 'p-content',
      icon: '📢',
      title: 'Authority nội dung địa phương',
      what: 'Content TikTok/Reels định kỳ về dinh dưỡng, mùa vụ, cách chọn trái cây — không chỉ là quảng cáo',
      why: 'Content có giá trị = reach organic cao + khách quay lại vì thấy brand là người thật, am hiểu',
      measurable: '4–5 bài/tuần, đạt 50K views/tháng trên TikTok trong 60 ngày',
      color: 'cyan',
      linkedSections: ['Lịch Nội dung Đa kênh', 'Mạng lưới Nội dung Chiến lược'],
    },
    {
      id: 'p-seeding',
      icon: '🌱',
      title: 'Xã hội hóa thảo luận có kiểm soát',
      what: 'Ma trận tài khoản seeding tạo thảo luận tự nhiên trong group và comment section',
      why: 'Social proof tự nhiên hiệu quả hơn ads 3× đối với quyết định mua thực phẩm địa phương',
      measurable: '20–30 seeding accounts hoạt động, 15–30 interactions/ngày trong group',
      color: 'amber',
      linkedSections: ['Cấu Trúc Ma Trận Seeding', 'Vận hành Seeding & Porter'],
    },
    {
      id: 'p-automation',
      icon: '🤖',
      title: 'Tự động hóa chuyển đổi leads',
      what: 'AI Chatbot xử lý hỏi giá, tư vấn sản phẩm, chốt đơn 24/7 qua Messenger + Zalo',
      why: 'Response time <30 giây quyết định tỷ lệ chốt — leads từ community và content không được để nguội',
      measurable: 'Chatbot xử lý 80% incoming messages, tỷ lệ chuyển đổi >12% trong 45 ngày',
      color: 'violet',
      linkedSections: ['Cơ chế hoạt động: Marketing - Chatbot - BrandLabs'],
    },
    {
      id: 'p-production',
      icon: '⚡',
      title: 'Sản xuất content hàng loạt tối ưu chi phí',
      what: 'BrandLabs AI Factory sản xuất 28+ bài/tuần với quy trình chuẩn hóa — ảnh, video, text đồng bộ',
      why: 'Volume content đủ lớn là điều kiện tiên quyết để cộng đồng và seeding hoạt động liên tục',
      measurable: '28 bài/tuần với chi phí sản xuất dưới 2 triệu VND/tháng',
      color: 'rose',
      linkedSections: ['Sản Xuất Content Trực Quan', 'Brandlabs & Marketing Workflows'],
    },
  ],
  implementationLogic:
    '5 trụ cột vận hành song song nhưng có thứ tự ưu tiên rõ ràng: (1) Cộng đồng + Content đặt nền tảng → (2) Seeding khuếch đại reach tự nhiên → (3) Chatbot convert leads → (4) BrandLabs duy trì volume nội dung. Toàn bộ ngân sách hạ tầng, kế hoạch seeding và lịch content ở các phần tiếp theo được tính toán dựa trên quy mô của 5 trụ cột này.',
  keyAssumptions: [
    'Thị trường Bình Dương có nhu cầu mua thực phẩm sạch online tăng ổn định sau 2022',
    'PHF có khả năng duy trì chất lượng sản phẩm nhất quán để không thất hứa khi seeding tạo kỳ vọng cao',
    'Team có khả năng produce 28+ bài content/tuần hoặc sẵn sàng dùng BrandLabs AI Factory',
    'Budget triển khai tối thiểu 15–20 triệu VND/tháng trong 3 tháng đầu (infra + seeding + content)',
    'Chatbot được tích hợp với Messenger + Zalo OA trước khi campaign bắt đầu',
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
