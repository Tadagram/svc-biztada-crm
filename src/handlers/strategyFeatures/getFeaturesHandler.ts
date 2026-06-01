import { FastifyReply, FastifyRequest } from 'fastify';

interface FeaturesQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategyFeaturesRow {
  strategy_features_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  workflows: [
    {
      id: 'wf-content',
      name: 'Sản xuất & Phân phối',
      category: 'BrandLabs → Marketing',
      color: 'amber',
      description: 'Thu thập nội dung trending tự động → Remake ghép footage thực tế → Lên lịch đa kênh → Seeding wave → Giám sát ngưỡng viral.',
      nodes: [
        { id: 'n1', type: 'collect', name: 'Thu thập nguồn', tool: 'brandlabs', config: 'TikTok scraper daily: filter >15k views/7 ngày. YouTube Shorts scraper weekly: >5k views.', output: '→ Video trending vào Content Library' },
        { id: 'n2', type: 'remake', name: 'Remake nội dung', tool: 'brandlabs', config: 'Ghép footage kho hàng PHF ≥40% + logo góc dưới phải + text overlay giá + CTA "Đặt ngay Zalo"', output: '→ Video đã remake sẵn' },
        { id: 'n3', type: 'schedule', name: 'Lên lịch đăng', tool: 'marketing', config: '3 TikTok × 3 video/tuần + 1 Fanpage × 4 Reels/tuần + Zalo OA × 5 posts/tuần. Khung giờ: 7h / 12h / 20h.', output: '→ Post queue 7 ngày tới' },
        { id: 'n4', type: 'seed_wave', name: 'Seeding sau đăng', tool: 'marketing', config: '3–5 seeder account comment trong 20 phút đầu. Tone xen kẽ: seed_question + reply_confirm.', output: '→ Social proof ban đầu' },
        { id: 'n5', type: 'monitor', name: 'Giám sát ngưỡng viral', tool: 'marketing', config: 'Check mỗi 30 phút: like, comment, share. Ngưỡng kích hoạt: >300 like/2h hoặc >30 comment.', output: '→ Viral Loop nếu đạt ngưỡng' },
      ],
    },
    {
      id: 'wf-seeding',
      name: 'Seeding Campaign',
      category: 'Marketing',
      color: 'emerald',
      description: 'Porter đăng bài gốc theo lịch → Wave 1 tò mò → Wave 2 xác nhận → Wave 3 lan rộng → Kiểm tra ngưỡng → Boost nếu viral.',
      nodes: [
        { id: 'n1', type: 'porter', name: 'Porter đăng bài', tool: 'marketing', config: '6 porter: 2/group × 3 groups + 2 porter/fanpage. 2 bài gốc/ngày/group, khung 7h và 20h.', output: '→ Bài post trên group/fanpage' },
        { id: 'n2', type: 'seed_wave', name: 'Wave 1 — Tò mò', tool: 'marketing', config: '3–4 seeders | T+5–15 phút | seed_question tone | Persona: Mẹ Bỉm Sữa', output: '→ Comment hỏi giá/giao hàng' },
        { id: 'n3', type: 'seed_wave', name: 'Wave 2 — Xác nhận', tool: 'marketing', config: '5–8 seeders | T+30–60 phút | reply_confirm tone | Persona: Chuyên Gia Dinh Dưỡng', output: '→ Comment review tích cực' },
        { id: 'n4', type: 'seed_wave', name: 'Wave 3 — Lan rộng', tool: 'marketing', config: '4–5 seeders | T+2–3 giờ | tag_friend tone | Persona: Reviewer Local', output: '→ Tag bạn bè khu vực' },
        { id: 'n5', type: 'condition', name: 'Viral check', tool: 'marketing', config: '>300 like/2h HOẶC >30 comment?', output: '→ Có → Wave Boost' },
        { id: 'n6', type: 'boost', name: 'Boost viral', tool: 'marketing', config: '+100k ngân sách 24h + 3 seeder reply thêm trong 30 phút', output: '→ Amplification' },
      ],
    },
    {
      id: 'wf-lead',
      name: 'Lead → CRM → Chốt',
      category: 'Marketing → Chatbot → CRM',
      color: 'blue',
      description: 'Phát hiện tín hiệu mua từ comment/inbox → Chatbot qualify 4 câu → Push CRM → Gửi báo giá theo tier → ZNS follow-up chuỗi nếu chưa chốt.',
      nodes: [
        { id: 'n1', type: 'trigger', name: 'Tín hiệu mua', tool: 'marketing', config: 'Keyword scan real-time: "giá", "mua", "đặt", "giao khu" trong comment/inbox FB & Zalo', output: '→ Lead event kích hoạt' },
        { id: 'n2', type: 'chatbot', name: 'Chatbot qualify', tool: 'chatbot', config: '4 câu: (1) Mục đích mua | (2) Thành phần gia đình | (3) Khu vực giao | (4) Ngân sách', output: '→ Qualified lead profile' },
        { id: 'n3', type: 'crm', name: 'Push CRM', tool: 'crm', config: 'Stage=interest | tag: platform + purchase_intent + delivery_area + budget_tier', output: '→ CRM record tạo mới' },
        { id: 'n4', type: 'quote', name: 'Gửi báo giá', tool: 'chatbot', config: 'Template tự động theo budget_tier × household_profile. Kèm ảnh + link đặt hàng.', output: '→ Báo giá gửi đến khách' },
        { id: 'n5', type: 'condition', name: 'Chốt trong 2h?', tool: 'crm', config: 'order_status = confirmed?', output: '→ Có: Done | Không: Follow-up' },
        { id: 'n6', type: 'followup', name: 'ZNS follow-up chuỗi', tool: 'marketing', config: 'T+2h: nhắc + freeship | T+24h: +5% off | T+48h: last chance — sau đó archive', output: '→ Conversion hoặc archive' },
      ],
    },
    {
      id: 'wf-viral',
      name: 'Viral Loop',
      category: 'Marketing → BrandLabs',
      color: 'purple',
      description: 'Giám sát metrics liên tục → Phát hiện viral → Seeder bổ sung + Tăng ngân sách đồng thời → Đăng chéo đa kênh trong 1h.',
      nodes: [
        { id: 'n1', type: 'monitor', name: 'Monitor metrics', tool: 'marketing', config: 'Poll mỗi 30 phút tất cả bài active: like, comment, share, view trên FB/TikTok/Zalo', output: '→ Metrics snapshot' },
        { id: 'n2', type: 'condition', name: 'Viral threshold', tool: 'marketing', config: '>300 like/2h OR >30 comment OR >50 share (bất kỳ 1 điều kiện)', output: '→ Viral = true' },
        { id: 'n3', type: 'seed_wave', name: 'Seeder bổ sung', tool: 'marketing', config: '3 seeders reply trong 30 phút — tone mix: khen + tag bạn bè (n3 & n4 song song)', output: '→ Engagement tăng thêm' },
        { id: 'n4', type: 'boost', name: 'Tăng ngân sách', tool: 'marketing', config: 'Auto approve +100k/24h cho bài viral', output: '→ Reach mở rộng mạnh' },
        { id: 'n5', type: 'crosspost', name: 'Đăng chéo đa kênh', tool: 'brandlabs', config: 'TikTok viral → FB Reels (trong 30 phút) + Zalo OA broadcast (trong 1h)', output: '→ Multichannel amplification' },
      ],
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

async function getFeaturesByGuest(
  request: FastifyRequest,
  guestId: string,
): Promise<StrategyFeaturesRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyFeaturesRow[]>`
    SELECT strategy_features_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_features
    WHERE deleted_at IS NULL
      AND guest_id = ${guestId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getFeaturesByUser(
  request: FastifyRequest,
  businessId: string,
  userId: string,
): Promise<StrategyFeaturesRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyFeaturesRow[]>`
    SELECT strategy_features_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_features
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getFeaturesByBusiness(
  request: FastifyRequest,
  businessId: string,
): Promise<StrategyFeaturesRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyFeaturesRow[]>`
    SELECT strategy_features_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_features
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: FeaturesQuery }>,
  reply: FastifyReply,
) {
  const queryGuestId = sanitizeId(request.query.guestId);
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyFeaturesRow | null = null;

  if (queryGuestId) {
    selected = await getFeaturesByGuest(request, queryGuestId);
    if (selected) source = 'guest';
  }

  if (!selected && effectiveUserId) {
    selected = await getFeaturesByUser(request, effectiveBusinessId, effectiveUserId);
    if (selected) source = 'user';
  }

  if (!selected) {
    selected = await getFeaturesByBusiness(request, effectiveBusinessId);
    if (selected) source = selected.business_id === 'demo' ? 'demo' : 'business';
  }

  if (!selected && effectiveBusinessId !== 'demo') {
    selected = await getFeaturesByBusiness(request, 'demo');
    if (selected) source = 'demo';
  }

  const payload = normalizePayload(selected?.payload);

  return reply.send({
    success: true,
    data: payload,
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
