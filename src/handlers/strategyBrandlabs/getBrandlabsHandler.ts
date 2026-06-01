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
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

function normalizePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try { return JSON.parse(payload); } catch { return FALLBACK_DEMO_DATA; }
  }
  return payload ?? FALLBACK_DEMO_DATA;
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
