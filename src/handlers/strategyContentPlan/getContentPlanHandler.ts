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
    { name: 'Social Proof — Kết quả thực tế', ratio: '30%', frequency: '4 posts/tuần', platforms: ['Facebook', 'TikTok'], examples: ['Review trái cây thực tế', 'Before/After sức khỏe'], bestTimes: ['20h-22h thứ 3,5'] },
    { name: 'Giáo dục — Kiến thức dinh dưỡng', ratio: '25%', frequency: '3-4 posts/tuần', platforms: ['Facebook', 'Zalo OA'], examples: ['5 trái cây tốt cho da'], bestTimes: ['7h-9h thứ 2,4,6'] },
    { name: 'Khuyến mãi & Flash Sale', ratio: '20%', frequency: '3 posts/tuần', platforms: ['Facebook', 'Zalo OA'], examples: ['Flash sale 24h', 'Combo cuối tuần'], bestTimes: ['11h thứ 2', '8h thứ 6'] },
    { name: 'Review & Testimonial', ratio: '15%', frequency: '2 posts/tuần', platforms: ['Facebook', 'TikTok'], examples: ['Video khách unbox'], bestTimes: ['19h-21h thứ 4'] },
    { name: 'Behind The Scenes', ratio: '10%', frequency: '1 post/tuần', platforms: ['Facebook', 'TikTok'], examples: ['Quy trình kiểm tra kho'], bestTimes: ['Thứ 7, 10h-12h'] },
  ],
  contentMix: { social_proof: '30%', educational: '25%', promotional: '20%', testimonial: '15%', behind_scenes: '10%' },
  postingSchedule: { Mon: ['Tip dinh dưỡng', 'Ưu đãi đầu tuần'], Tue: ['Before/After'], Wed: ['Kiến thức trái cây', 'Review khách'], Thu: ['Behind the scenes'], Fri: ['Flash sale', 'Social proof'], Sat: ['Review video', 'Educate'], Sun: ['Social proof viral', 'Story'] },
  contentFormats: ['Ảnh carousel 5-7 tấm', 'Video Reels 15-30s', 'Video TikTok 30-60s', 'Story tương tác'],
  hashtagStrategy: ['#TráiCâySạch #BìnhDương (brand)', '#TráiCâyTươi #DiệpDưỡng (topic)', '#ReviewTráiCây #GiaoTậnNơi (social proof)'],
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
