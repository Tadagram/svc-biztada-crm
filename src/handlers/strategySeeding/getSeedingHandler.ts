import { FastifyReply, FastifyRequest } from 'fastify';

interface SeedingQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategySeedingRow {
  strategy_seeding_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  porterAccountsTotal: 6,
  seedingAccountsTotal: 35,
  demographicsTarget: ['Nữ 25-40 tuổi, khu vực Bình Dương/HCM', 'Quan tâm sức khỏe, gia đình, thực phẩm sạch'],
  warmupWeeks: 2,
  phases: [
    {
      platform: 'Facebook',
      accountCount: 20,
      targetGroups: ['Hội mẹ bỉm sữa Bình Dương', 'Ăn uống Thủ Dầu Một'],
      commentFrequency: '3-5 comment/ngày/account',
      commentTypes: ['Hỏi giá combo', 'Review tích cực'],
      demographics: ['Ảnh thật gia đình, 3+ tháng tuổi'],
    },
  ],
  matrix: [
    { type: 'seed_question', ratio: '40%', tone: 'curious', timing: 'trong 15 phút đầu', example: 'Giao tận nơi khu Thủ Dầu Một không ạ?' },
    { type: 'reply_confirm', ratio: '30%', tone: 'positive', timing: 'sau 30-60 phút', example: 'Mình order 3 lần rồi, tươi lắm chị ơi' },
    { type: 'tag_friend', ratio: '20%', tone: 'recommend', timing: 'sau 1-2 giờ', example: '@[tên bạn] ơi vào đây mua trái cây đi' },
    { type: 'review_detail', ratio: '10%', tone: 'authentic', timing: 'sau 3-6 giờ', example: 'Vừa nhận 5kg xoài, tươi ngon, đóng gói cẩn thận' },
  ],
  notes: 'Không seeding đồng loạt — trải đều 4-6 giờ/bài.',
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

async function getByGuest(request: FastifyRequest, guestId: string): Promise<StrategySeedingRow | null> {
  const rows = await request.prisma.$queryRaw<StrategySeedingRow[]>`
    SELECT strategy_seeding_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_seeding
    WHERE deleted_at IS NULL AND guest_id = ${guestId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByUser(request: FastifyRequest, businessId: string, userId: string): Promise<StrategySeedingRow | null> {
  const rows = await request.prisma.$queryRaw<StrategySeedingRow[]>`
    SELECT strategy_seeding_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_seeding
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id = ${userId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByBusiness(request: FastifyRequest, businessId: string): Promise<StrategySeedingRow | null> {
  const rows = await request.prisma.$queryRaw<StrategySeedingRow[]>`
    SELECT strategy_seeding_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_seeding
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id IS NULL
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: SeedingQuery }>,
  reply: FastifyReply,
) {
  const queryGuestId = sanitizeId(request.query.guestId);
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategySeedingRow | null = null;

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
