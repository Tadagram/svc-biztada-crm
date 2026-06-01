import { FastifyReply, FastifyRequest } from 'fastify';

interface BrandlabsQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategyBrandlabsRow {
  strategy_brandlabs_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  sourceChannels: [
    { platform: 'TikTok', contentType: 'food_review', keywords: ['#tráicây', '#thựcphẩmsạch', '#ănclean', '#detox', '#giađình'], filterCriteria: '>15k views trong 7 ngày, <30 ngày tuổi, không nhạc bản quyền mạnh', fetchFrequency: 'daily' },
    { platform: 'YouTube Shorts', contentType: 'nutrition_education', keywords: ['trái cây tươi', 'thực phẩm sạch', 'dinh dưỡng gia đình'], filterCriteria: '>5k views, <30 ngày, cho phép embed', fetchFrequency: 'weekly' },
  ],
  remakeDirection: 'Lấy video TikTok về trái cây/ẩm thực trending → Ghép với footage thực tế kho hàng + đóng gói Phú Hòa → Thêm text overlay giá/chất lượng + logo + CTA đặt hàng Zalo',
  contentVolume: '20–25 posts/tháng',
  autoSchedule: {
    contentPerWeek: 5,
    platforms: ['Facebook', 'Zalo OA', 'TikTok'],
    bestTimes: ['7h–8h', '12h–13h', '20h–22h'],
    queueDays: 7,
  },
  seedingAfterPost: {
    commentWithinMinutes: 20,
    accountsPerPost: 5,
    replyToComments: true,
    commentTypes: ['Hỏi giao hàng khu vực', 'Khen chất lượng + hỏi giá combo', 'Tag bạn bè hay mua trái cây'],
    escalationHours: 4,
  },
  viralTriggers: [
    'Nếu bài đạt >300 like trong 2h → boost thêm 100k ngân sách 24h',
    'Nếu comment >30 → seeder thêm 3 account reply trong 30 phút',
    'TikTok >8k view → đăng lại lên Facebook Reels ngay',
  ],
  brandGuidelines: [
    'Không dùng nguyên video người khác — phải có footage kho/sản phẩm thực tế ≥40%',
    'Logo Phú Hòa Fresh góc dưới phải, watermark nhẹ',
    'Caption bắt đầu bằng pain point hoặc câu hỏi gợi tò mò',
    'CTA cuối: Đặt hàng Zalo OA hoặc link đặt online',
  ],
  workflows: [
    {
      name: 'Comment/Inbox → Chatbot → CRM → Chốt',
      trigger: 'Khách comment hoặc inbox trên Facebook/Zalo',
      steps: [
        { step: 1, action: 'Chatbot tự động reply trong 30 giây', tool: 'chatbot', timing: '0–30 giây', responsible: 'AI tự động' },
        { step: 2, action: 'Hỏi nhu cầu 3 câu (loại trái cây, số lượng, khu vực giao)', tool: 'chatbot', timing: '1–3 phút', responsible: 'AI tự động' },
        { step: 3, action: 'Push vào CRM với tag nguồn và nhu cầu', tool: 'crm', timing: 'ngay sau hội thoại', responsible: 'AI tự động' },
        { step: 4, action: 'Chatbot gửi báo giá + combo phù hợp', tool: 'chatbot', timing: '3–5 phút', responsible: 'AI tự động' },
        { step: 5, action: 'Nhắc lại sau 2h nếu chưa chốt', tool: 'marketing', timing: 'T+2h', responsible: 'Marketing automation' },
      ],
      expectedResult: 'Tỷ lệ chuyển đổi comment → đặt hàng > 20%',
      tools: ['chatbot', 'crm', 'marketing'],
    },
    {
      name: 'Viral Content → Seeding Wave → Boost',
      trigger: 'Bài post đạt ngưỡng viral (>300 like trong 2h)',
      steps: [
        { step: 1, action: 'Marketing automation phát hiện ngưỡng viral', tool: 'marketing', timing: '0–5 phút', responsible: 'Hệ thống tự động' },
        { step: 2, action: 'Kích hoạt seeding wave thêm 5 account trong 30 phút', tool: 'marketing', timing: '5–30 phút', responsible: 'Marketing automation' },
        { step: 3, action: 'Boost ngân sách 100k cho 24h tiếp theo', tool: 'marketing', timing: '30 phút', responsible: 'Marketing tự duyệt' },
        { step: 4, action: 'Đăng chéo lên TikTok và Zalo OA', tool: 'brandlabs', timing: '1h sau khi viral xác nhận', responsible: 'BrandLabs tự động' },
      ],
      expectedResult: 'Bài đạt >1000 tương tác, lan rộng đa kênh trong 24h',
      tools: ['marketing', 'brandlabs'],
    },
  ],
  contentLibrary: {
    totalAssets: 120,
    lastUpdated: '2026-05-30',
    categories: [
      { name: 'Video TikTok nguồn', count: 45, source: 'TikTok Scraper — chạy daily', tags: ['#tráicây', '#thựcphẩmsạch', '#ănclean', '#detox', '#giađình'], filterNote: '>15k views/7 ngày, <30 ngày tuổi, không nhạc bản quyền mạnh' },
      { name: 'Footage kho hàng PHF', count: 38, source: 'Nhóm kho tự quay — upload weekly', tags: ['đóng gói', 'kho hàng', 'sản phẩm tươi', 'nhân viên kiểm hàng', 'xe giao'] },
      { name: 'Video YouTube Shorts', count: 22, source: 'YouTube Scraper — chạy weekly', tags: ['nutrition facts', 'healthy food', 'family meal', 'fruit tips', 'clean eating'] },
      { name: 'Ảnh sản phẩm', count: 15, source: 'Upload thủ công — monthly', tags: ['xoài cát Hòa Lộc', 'cam sành', 'bưởi da xanh', 'hộp quà premium', 'combo'] },
    ],
  },
  publishChannelMap: [
    {
      contentType: 'Remake TikTok (video 15–30s)',
      sourceFrom: ['Video TikTok nguồn', 'Footage kho hàng PHF'],
      publishTo: ['TikTok Trái Cây & Sức Khỏe', 'TikTok Phụ Nữ Bận Rộn', 'TikTok Bữa Nhà & Gia Đình'],
      weeklyVolume: 9,
      seederConfig: '3 seeders comment trong 10 phút đầu',
      notes: '3 kênh TikTok × 3 video/tuần — luân phiên chủ đề theo ngày',
    },
    {
      contentType: 'Remake Facebook Reels (30–60s)',
      sourceFrom: ['Video TikTok nguồn', 'Footage kho hàng PHF'],
      publishTo: ['Fanpage Sàn Sale Thủ Dầu Một'],
      weeklyVolume: 4,
      seederConfig: '5 seeders trong 15 phút đầu',
      notes: 'Dùng lại từ TikTok remake — thêm caption giá thực và CTA "Đặt ngay Zalo"',
    },
    {
      contentType: 'Ảnh Carousel (5–7 tấm)',
      sourceFrom: ['Ảnh sản phẩm', 'Footage kho hàng PHF'],
      publishTo: ['Fanpage Sàn Sale TDM', 'Group Sống Khỏe', 'Group Phụ Nữ Đẹp', 'Group Bếp Nhà'],
      weeklyVolume: 12,
      seederConfig: '4 seeders trong 20 phút đầu',
      notes: 'Chủ đề xoay vòng theo tuần: flash sale → review thực tế → dinh dưỡng → combo quà tặng',
    },
    {
      contentType: 'Nội dung gốc Zalo OA',
      sourceFrom: ['Ảnh sản phẩm'],
      publishTo: ['Zalo OA Phú Hòa Fresh'],
      weeklyVolume: 5,
      seederConfig: 'Không seeding — organic ZNS broadcast',
      notes: 'ZNS follow-up + thông báo deal riêng cho subscriber đã opt-in',
    },
  ],
  chatbotConfig: {
    consultationStyle: 'Tư vấn chủ động như "người bạn am hiểu dinh dưỡng" — gợi combo theo nhu cầu thực tế, không push sale cứng. Tone: gần gũi, xưng mình/bạn, emoji vừa phải.',
    platforms: ['Facebook Messenger', 'Zalo OA Chat'],
    responseTime: '< 30 giây (AI tự động 24/7)',
    qualificationQuestions: [
      { step: 1, question: 'Bạn đang tìm trái cây cho mục đích gì ạ — ăn hằng ngày, quà biếu, hay detox?', purpose: 'Phân loại purchase_intent', crmField: 'purchase_intent', options: ['Ăn hằng ngày', 'Quà biếu/tặng', 'Detox/làm đẹp', 'Cho trẻ nhỏ'] },
      { step: 2, question: 'Gia đình bạn có mấy người, có trẻ nhỏ hoặc người lớn tuổi không?', purpose: 'Gợi combo phù hợp cấu trúc gia đình', crmField: 'household_profile', options: ['1–2 người', '3–4 người', '5+ người', 'Có trẻ < 5 tuổi', 'Có người cao tuổi'] },
      { step: 3, question: 'Bạn ở quận/khu nào trong Bình Dương ạ?', purpose: 'Kiểm tra vùng giao hàng + tính phí ship', crmField: 'delivery_area', options: ['Thủ Dầu Một', 'Thuận An', 'Dĩ An', 'Bến Cát', 'Tân Uyên', 'Nơi khác'] },
      { step: 4, question: 'Ngân sách mình nhắm khoảng bao nhiêu cho đơn lần này?', purpose: 'Gợi tier sản phẩm phù hợp', crmField: 'budget_range', options: ['< 150k', '150k–300k', '300k–500k', '> 500k (hộp quà cao cấp)'] },
    ],
  },
  crmFunnel: {
    stages: [
      { id: 'awareness', name: 'Nhận biết', color: 'slate', trigger: 'Tương tác lần đầu với bài post (like/comment/share)', source: ['Group Facebook', 'TikTok comment', 'Zalo group'], dataCollected: ['platform_source', 'post_id', 'interaction_type', 'timestamp'], nextAction: 'Retarget với seeder wave 2 trong 1h' },
      { id: 'interest', name: 'Quan tâm', color: 'blue', trigger: 'Chủ động nhắn tin hoặc inbox hỏi giá', source: ['Facebook Messenger', 'Zalo OA Chat'], dataCollected: ['contact_name', 'purchase_intent', 'delivery_area'], nextAction: 'Chatbot tư vấn + gợi combo ngay trong 30 giây' },
      { id: 'consideration', name: 'Cân nhắc', color: 'amber', trigger: 'Đã nhận báo giá nhưng chưa đặt hàng sau 2h', source: ['Chatbot conversation log'], dataCollected: ['household_profile', 'budget_range', 'products_discussed'], nextAction: 'ZNS nhắc lại + ưu đãi freeship trong T+2h' },
      { id: 'purchase', name: 'Đặt hàng', color: 'emerald', trigger: 'Xác nhận đơn hàng + thanh toán', source: ['Chatbot', 'Zalo OA'], dataCollected: ['order_value', 'product_list', 'delivery_time', 'payment_method'], nextAction: 'Xác nhận đơn + đẩy vào order management system' },
      { id: 'retention', name: 'Tái mua', color: 'purple', trigger: 'T+3 ngày sau đơn đầu tiên', source: ['Zalo ZNS broadcast'], dataCollected: ['satisfaction_score', 'reorder_intent', 'referral_willingness'], nextAction: 'ZNS ưu đãi lần 2 + mời vào loyalty Zalo group' },
    ],
    leadSources: [
      { source: 'Facebook comment/inbox', expectedVolume: '15–25 leads/ngày', conversionRate: '12–18%' },
      { source: 'Zalo group chat', expectedVolume: '8–12 leads/ngày', conversionRate: '20–28%' },
      { source: 'TikTok link in bio', expectedVolume: '5–8 leads/ngày', conversionRate: '8–12%' },
    ],
  },
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

async function getByGuest(request: FastifyRequest, guestId: string): Promise<StrategyBrandlabsRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyBrandlabsRow[]>`
    SELECT strategy_brandlabs_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_brandlabs WHERE deleted_at IS NULL AND guest_id = ${guestId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByUser(request: FastifyRequest, businessId: string, userId: string): Promise<StrategyBrandlabsRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyBrandlabsRow[]>`
    SELECT strategy_brandlabs_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_brandlabs WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id = ${userId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByBusiness(request: FastifyRequest, businessId: string): Promise<StrategyBrandlabsRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyBrandlabsRow[]>`
    SELECT strategy_brandlabs_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_brandlabs WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id IS NULL
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: BrandlabsQuery }>,
  reply: FastifyReply,
) {
  const queryGuestId = sanitizeId(request.query.guestId);
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyBrandlabsRow | null = null;

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
