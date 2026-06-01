import { FastifyReply, FastifyRequest } from 'fastify';

interface ContentPlanQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategyContentPlanRow {
  strategy_content_plan_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  totalPostsPerWeek: 14,
  platforms: ['Facebook', 'Zalo OA', 'TikTok'],
  topicGroups: [
    { name: 'Social Proof — Kết quả thực tế', ratio: '30%', frequency: '4 posts/tuần', platforms: ['Facebook', 'TikTok'], examples: ['Review trái cây thực tế của khách', 'Before/After sức khỏe sau 1 tuần dùng'], bestTimes: ['20h–22h thứ 3, 5'] },
    { name: 'Giáo dục — Kiến thức dinh dưỡng', ratio: '25%', frequency: '3–4 posts/tuần', platforms: ['Facebook', 'Zalo OA'], examples: ['5 trái cây tốt nhất cho da mùa nắng', 'Cách chọn xoài chín ngon'], bestTimes: ['7h–9h thứ 2, 4, 6'] },
    { name: 'Khuyến mãi & Flash Sale', ratio: '20%', frequency: '3 posts/tuần', platforms: ['Facebook', 'Zalo OA'], examples: ['Flash sale 24h — combo gia đình', 'Ưu đãi cuối tuần kèm freeship'], bestTimes: ['11h thứ 2', '8h thứ 6'] },
    { name: 'Review & Testimonial', ratio: '15%', frequency: '2 posts/tuần', platforms: ['Facebook', 'TikTok'], examples: ['Video khách unbox đơn hàng', 'Screenshot feedback Zalo khách thật'], bestTimes: ['19h–21h thứ 4'] },
    { name: 'Behind The Scenes', ratio: '10%', frequency: '1 post/tuần', platforms: ['Facebook', 'TikTok'], examples: ['Quy trình kiểm tra chất lượng tại kho', 'Ngày đóng gói 200 đơn cuối tuần'], bestTimes: ['Thứ 7, 10h–12h'] },
  ],
  contentMix: { social_proof: '30%', educational: '25%', promotional: '20%', testimonial: '15%', behind_scenes: '10%' },
  postingSchedule: {
    Mon: ['Tip dinh dưỡng đầu tuần', 'Ưu đãi đầu tuần'],
    Tue: ['Before/After sức khỏe'],
    Wed: ['Kiến thức trái cây', 'Review khách thật'],
    Thu: ['Behind the scenes kho hàng'],
    Fri: ['Flash sale 24h', 'Social proof trending'],
    Sat: ['Review video TikTok', 'Giáo dục dinh dưỡng'],
    Sun: ['Social proof viral', 'Story tương tác'],
  },
  contentFormats: ['Ảnh carousel 5–7 tấm', 'Video Reels 15–30 giây', 'Video TikTok 30–60 giây', 'Story tương tác', 'Infographic dinh dưỡng'],
  hashtagStrategy: [
    '#TráiCâySạch #PhúHòaFresh (brand)',
    '#BìnhDương #ThủDầuMột (địa phương)',
    '#TráiCâyTươi #TốtChoSứcKhỏe (topic)',
    '#ReviewTráiCây #GiaoTậnNơi (social proof + cta)',
  ],
  channelPlans: [
    {
      channel: 'Facebook Groups (3 group)',
      postsPerWeek: 42,
      contentFocus: 'Community trust — giáo dục dinh dưỡng + social proof. Không bán hàng trực tiếp.',
      topTopics: ['Dinh dưỡng gia đình theo mùa', 'Review trái cây thực tế', 'Sức khỏe mùa hè Bình Dương'],
      bestFormats: ['Ảnh carousel 5–7 tấm', 'Infographic dinh dưỡng đơn giản'],
      postingTimes: ['7h–8h', '12h', '20h'],
    },
    {
      channel: 'Fanpage Sàn Sale TDM',
      postsPerWeek: 56,
      contentFocus: 'Sales-forward — deal, combo, flash sale, CTA đặt hàng rõ ràng sau mỗi bài.',
      topTopics: ['Flash sale 24h theo khung giờ', 'Combo biếu tặng cao cấp', 'Review đơn hàng thật', 'Quà tặng dịp lễ'],
      bestFormats: ['Video Reels 15–30s', 'Ảnh deal flash sale giá to rõ'],
      postingTimes: ['7h', '11h30', '16h', '20h'],
    },
    {
      channel: 'TikTok (3 kênh)',
      postsPerWeek: 27,
      contentFocus: 'Hook mạnh trong 3s đầu — giáo dục nhẹ — kéo traffic về link Zalo/fanpage ở bio.',
      topTopics: ['Tip chọn trái cây ngon theo mùa', 'Routine ăn sáng lành mạnh gia đình', 'Unbox đơn hàng tươi ngon'],
      bestFormats: ['Video 15–30s hook đầu mạnh', 'Reply/Stitch với trending clip'],
      postingTimes: ['7h', '12h', '20h–21h'],
    },
    {
      channel: 'Zalo OA',
      postsPerWeek: 5,
      contentFocus: 'Loyalty follow-up — ZNS, voucher, nhắc đơn cũ, exclusive deal chỉ cho subscriber.',
      topTopics: ['Ưu đãi riêng cho subscriber đã opt-in', 'Nhắc deal theo mùa vụ', 'Flash deal exclusive 48h'],
      bestFormats: ['ZNS template ngắn gọn', 'Ảnh sản phẩm + CTA 1 dòng'],
      postingTimes: ['8h', '12h', '19h30'],
    },
  ],
  topicKeywords: [
    {
      topicGroup: 'Social Proof — Kết quả thực tế',
      keywords: ['trái cây sạch Bình Dương', 'review Phú Hòa Fresh', 'đặt hàng trái cây online giao tận nơi', 'trái cây Thủ Dầu Một tươi'],
      hashtags: ['#ReviewTráiCây', '#TráiCâyTươi', '#GiaoTậnNơi', '#PhúHòaFresh', '#BìnhDương'],
      discussionAngles: ['So sánh giá chợ truyền thống vs PHF giao tận nơi', 'Unbox 5kg xoài cát Hòa Lộc thực tế', 'Giao hàng đúng giờ khu Thủ Dầu Một'],
    },
    {
      topicGroup: 'Giáo dục — Kiến thức dinh dưỡng',
      keywords: ['trái cây tốt cho sức khỏe trẻ nhỏ', 'detox tự nhiên không nhịn ăn', 'ăn trái cây đúng thời điểm trong ngày', 'dinh dưỡng sau sinh cho mẹ bỉm'],
      hashtags: ['#ĂnLành', '#SứcKhỏeGiaĐình', '#ThựcPhẩmSạch', '#DiệtMỡTựNhiên', '#DinhDưỡng'],
      discussionAngles: ['Top 5 trái cây tốt nhất cho mẹ bỉm sữa tuần này', 'Cách ăn xoài đúng mùa không tăng cân', 'Combo detox 3 ngày với trái cây PHF dễ làm'],
    },
    {
      topicGroup: 'Khuyến mãi & Flash Sale',
      keywords: ['mua trái cây giảm giá Bình Dương', 'combo trái cây freeship TDM', 'deal cuối tuần trái cây', 'mua nhiều giảm thêm'],
      hashtags: ['#FlashSale', '#ComboGiaĐình', '#FreeShipTDM', '#ƯuĐãiHômNay', '#MuaNhiềuGiảmNhiều'],
      discussionAngles: ['Combo tiết kiệm < 200k cho gia đình 4 người cả tuần', 'Freeship nội ô Thủ Dầu Một mỗi thứ 5', 'Mua 10kg tặng thêm 1kg xoài cát'],
    },
  ],
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

function normalizePayload(payload: unknown): unknown {
  let parsed: Record<string, unknown> | null = null;
  if (typeof payload === 'string') {
    try { parsed = JSON.parse(payload) as Record<string, unknown>; } catch { /* use fallback */ }
  } else if (payload && typeof payload === 'object') {
    parsed = payload as Record<string, unknown>;
  }
  if (!parsed) return FALLBACK_DEMO_DATA;
  // Merge: fill missing new fields from FALLBACK so old DB records stay compatible
  return { ...FALLBACK_DEMO_DATA, ...parsed };
}

async function getByGuest(request: FastifyRequest, guestId: string): Promise<StrategyContentPlanRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyContentPlanRow[]>`
    SELECT strategy_content_plan_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_content_plan
    WHERE deleted_at IS NULL AND guest_id = ${guestId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByUser(request: FastifyRequest, businessId: string, userId: string): Promise<StrategyContentPlanRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyContentPlanRow[]>`
    SELECT strategy_content_plan_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_content_plan
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id = ${userId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByBusiness(request: FastifyRequest, businessId: string): Promise<StrategyContentPlanRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyContentPlanRow[]>`
    SELECT strategy_content_plan_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_content_plan
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id IS NULL
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: ContentPlanQuery }>,
  reply: FastifyReply,
) {
  const queryGuestId = sanitizeId(request.query.guestId);
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyContentPlanRow | null = null;

  if (queryGuestId) {
    selected = await getByGuest(request, queryGuestId);
    if (selected) source = 'guest';
  }
  if (!selected && effectiveUserId) {
    selected = await getByUser(request, effectiveBusinessId, effectiveUserId);
    if (selected) source = 'user';
  }
  if (!selected) {
    selected = await getByBusiness(request, effectiveBusinessId);
    if (selected) source = selected.business_id === 'demo' ? 'demo' : 'business';
  }
  if (!selected && effectiveBusinessId !== 'demo') {
    selected = await getByBusiness(request, 'demo');
    if (selected) source = 'demo';
  }

  return reply.send({
    success: true,
    data: normalizePayload(selected?.payload),
    meta: {
      source,
      guestId: selected?.guest_id ?? queryGuestId ?? null,
      businessId: effectiveBusinessId,
      userId: effectiveUserId ?? null,
      usedFallbackDemo: !selected,
      updatedAt: selected?.updated_at?.toISOString() ?? null,
    },
  });
}
