import { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';

interface ContentEngineQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface ContentEngineRow {
  strategy_content_engine_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

// TODO: Replace with actual mock data from frontend
const FALLBACK_DEMO_DATA = {
  pipelineSteps: [
  {
    id: 'collect', step: 1, icon: '📡', color: '#10b981',
    label: 'Tổng hợp tài nguyên', sublabel: 'từ các kênh',
    desc: 'Thu thập video/ảnh/clip từ Fanpage, TikTok, YouTube, Instagram, Zalo OA. Crawl tự động 2 lần/ngày, lưu thô vào staging queue chờ xử lý.',
    auto: 'Crawl 2×/ngày · 5 nguồn',
  },
  {
    id: 'inject_direction', step: 2, icon: '🎯', color: '#f59e0b',
    label: 'Tiêm định hướng', sublabel: 'đặt điểm kênh',
    desc: 'AI nhận slot kênh đích + định hướng nội dung tuần (mùa vụ, sản phẩm cần push, tone). Gắn metadata nhân vật & phong cách trước khi Remake.',
    auto: 'AI gắn metadata tự động',
  },
  {
    id: 'remake', step: 3, icon: '🤖', color: '#06b6d4',
    label: 'Remake tự động', sublabel: 'theo đặc tính kênh',
    desc: 'Xuất 3 biến thể: 9:16 TikTok/Reels · 1:1 Fanpage/Zalo · Carousel 5–8 slide. Ghép đúng nhân vật, giọng TTS, watermark logo tự động.',
    auto: '3 biến thể/nguồn · auto-tag',
  },
  {
    id: 'classify_distribute', step: 4, icon: '🗂️', color: '#8b5cf6',
    label: 'Phân loại danh mục', sublabel: 'phân bổ thư viện',
    desc: 'AI gán danh mục phù hợp theo đặc điểm doanh nghiệp (AI đề xuất số lượng & tên danh mục khi trợ lý ảo trao đổi với Guest). Xếp lịch auto-post theo khung vàng.',
    auto: 'Auto-post · lịch vàng',
  },
],
  hubChannels: [
  {
    id: 'fanpage', platform: 'Facebook Fanpage', icon: '📘', color: '#60a5fa',
    name: 'Phú Hòa Fresh', emoji: '🛒',
    purpose: 'Kênh chủ lực chuyển đổi — tập trung đơn hàng B2C nội địa Bình Dương, kéo khách cũ quay lại',
    trait: 'Thân thiện, gần gũi, ngôn ngữ chị-em nội trợ. Không dùng thuật ngữ kỹ thuật. Ưu tiên hình ảnh thật, review thật.',
    topic: 'Hàng tươi mỗi ngày — sầu riêng, xoài, rau củ hữu cơ Bình Dương',
    persona: 'Chị Hòa',
    audience: 'Mẹ bỉm sữa Bình Dương 25–40t · mua thực phẩm hàng tuần',
    kpi: '500 like/tháng → 2k/6 tháng',
    deploy: '5 bài/tuần · Ưu tiên T2, T4, T6 · Boost post vào T6 buổi sáng',
    contentFocus: ['Flash deal hàng mới nhập', 'Review khách hàng thật (UGC)', 'Hậu trường vận chuyển & kiểm hàng', 'Combo tiết kiệm cuối tuần'],
  },
  {
    id: 'tiktok', platform: 'TikTok', icon: '🎵', color: '#f472b6',
    name: '@phuhoafresh', emoji: '⚡',
    purpose: 'Kênh viral & brand awareness — kéo nhận diện mới, tăng organic reach qua FYP cho nhóm trẻ healthy lifestyle',
    trait: 'Năng động, vui, trendy. Dùng trend âm nhạc + effect. Format 9:16 ngắn 15–30s. Không cứng nhắc, không dài dòng.',
    topic: 'Công thức & tips sức khỏe từ trái cây — trend gắn sản phẩm PHF',
    persona: 'Bé Fresh (mascot AI)',
    audience: 'Gen Z / Millennial 18–30t · healthy lifestyle',
    kpi: '1k follower/tháng · 5–8% engagement',
    deploy: '5 video/tuần · 12h & 19h · Duet + Stitch để khuếch đại',
    contentFocus: ['Công thức sinh tố/nước ép từ sản phẩm PHF', 'Challenge ăn lành 7 ngày', 'Reaction hương vị trái cây theo mùa', 'Behind the scene vườn đối tác'],
  },
  {
    id: 'zalo_oa', platform: 'Zalo OA', icon: '💬', color: '#34d399',
    name: 'PHF Zalo OA', emoji: '📨',
    purpose: 'Kênh retention & repeat order — giữ chân khách cũ, đẩy đơn hàng định kỳ qua ZNS broadcast',
    trait: 'Trực tiếp, ngắn gọn, rõ CTA. Mỗi tin nhắn phải có hành động cụ thể. Không dài dòng. Tần suất đúng — không spam.',
    topic: 'Thông báo hàng mới, deal tuần, đặt hàng nhanh',
    persona: 'Chị Hòa (ZNS bot)',
    audience: 'Khách hàng cũ · OA list · retention & repeat order',
    kpi: 'ZNS open rate >40% · đặt lại sau 2 tuần',
    deploy: 'ZNS broadcast T6 10h + Broadcast T2 8h · Push deal flash T7–CN',
    contentFocus: ['ZNS hàng mới nhập tuần', 'Combo deal cuối tuần với code giảm giá', 'Nhắc đặt lại theo chu kỳ mua hàng', 'Thông báo khuyến mãi VIP member'],
  },
],
  seedingPersonas: [
  {
    id: 'mom_group', label: 'Mẹ bỉm sữa', icon: '👩', color: '#f472b6',
    ratio: 32, cloneAccounts: 3, platform: 'Facebook Groups',
    behavior: 'Share deal vào group mẹ, hỏi về nguồn gốc & chứng nhận an toàn thực phẩm, tag bạn trong comment đề xuất sản phẩm.',
    psychGoal: 'Tạo cảm giác cộng đồng tin tưởng — lan tỏa qua mạng lưới mom-trust organic trong nhóm mẹ bỉm.',
    traits: [90, 65, 45, 75, 85],
    waves: ['Wave 1 · 0–30ph sau đăng', 'Comment hỏi dò nguồn gốc', 'Tag bạn bè cùng nhóm'],
    sampleComment: '"Chị ơi mình mua cho bé được không, trái cây có chứng nhận an toàn không ạ?"',
  },
  {
    id: 'nutrition_expert', label: 'Chuyên gia Dinh Dưỡng', icon: '🥗', color: '#f59e0b',
    ratio: 27, cloneAccounts: 70, platform: 'Facebook + TikTok',
    behavior: 'Phân tích thành phần, độ sạch chứng chỉ organic. So sánh giá trị dinh dưỡng với đối thủ theo góc học thuật.',
    psychGoal: 'Tạo trust tuyệt đối dựa trên góc nhìn khoa học — làm đám đông nghe theo ý kiến "chuyên gia".',
    traits: [40, 60, 90, 100, 95],
    waves: ['Wave 2 · 1–2h sau đăng', 'Bình luận phân tích chuyên sâu', 'So sánh với chuẩn quốc tế'],
    sampleComment: '"Mình theo dõi PHF một thời gian, chỉ số vitamin C trong xoài cát HL của họ cao hơn thị trường 20–30%."',
  },
  {
    id: 'food_reviewer', label: 'Reviewer Thực Phẩm', icon: '📱', color: '#34d399',
    ratio: 23, cloneAccounts: 50, platform: 'TikTok + Facebook',
    behavior: 'Đánh giá hương vị thật, đăng ảnh review chân thực, so sánh giá thị trường, gợi ý combo.',
    psychGoal: 'Khuếch đại UGC thật — content đáng tin dẫn thêm nhiều review thật từ cộng đồng thực.',
    traits: [70, 85, 65, 50, 75],
    waves: ['Wave 1+2 · 0–2h sau đăng', 'Ảnh unboxing + tasting', 'So sánh giá với siêu thị'],
    sampleComment: '"Vừa nhận đơn xoài cát HL, ngọt mà không gắt, size đều, giao nhanh — giá nhỉnh hơn chợ tí nhưng xứng đáng!"',
  },
  {
    id: 'healthy_youth', label: 'Thanh niên Healthy', icon: '💪', color: '#60a5fa',
    ratio: 18, cloneAccounts: 30, platform: 'TikTok',
    behavior: 'Duet TikTok, trend healthy eating, tag bạn bè cùng thử công thức từ PHF, chia sẻ FYP.',
    psychGoal: 'Viral qua FYP — kéo Gen Z organic reach bằng nội dung fun & relatable không lộ quảng cáo.',
    traits: [65, 90, 35, 80, 60],
    waves: ['Wave 1+3 · 0–4h sau đăng', 'Duet / Stitch video gốc', 'Challenge tag bạn bè'],
    sampleComment: '"Duet này vì mình đang làm đúng cái challenge này luôn 😆 @bạn thử không?"',
  },
],
};


function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Querystring: ContentEngineQuery }>,
  reply: FastifyReply,
) {
  const { guestId, businessId, userId } = request.query;
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(guestId);
  const effectiveUserId = authUserId ?? sanitizeId(userId);
  const effectiveBusinessId = sanitizeId(businessId) ?? 'demo';

  let source: SourceType = 'demo';
  let rows: ContentEngineRow[] = [];

  if (effectiveGuestId) {
    rows = await request.prisma.$queryRaw<ContentEngineRow[]>`
      SELECT strategy_content_engine_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_content_engine
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'guest';
  } else if (effectiveUserId) {
    rows = await request.prisma.$queryRaw<ContentEngineRow[]>`
      SELECT strategy_content_engine_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_content_engine
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'user';
  } else if (effectiveBusinessId !== 'demo') {
    rows = await request.prisma.$queryRaw<ContentEngineRow[]>`
      SELECT strategy_content_engine_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_content_engine
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
        id: row.strategy_content_engine_id,
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
