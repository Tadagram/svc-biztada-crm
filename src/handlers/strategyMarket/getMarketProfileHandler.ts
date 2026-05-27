import { FastifyReply, FastifyRequest } from 'fastify';

interface MarketProfileQuery {
  businessId?: string;
  userId?: string;
}

type SourceType = 'user' | 'business' | 'demo';

interface StrategyMarketProfileRow {
  strategy_market_profile_id: string;
  business_id: string;
  user_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  location: {
    region: 'Binh Duong',
    city: 'Thu Dau Mot',
    stats: [
      { label: 'Dan so Binh Duong (uoc cuoi 2024)', value: '~3,1 trieu nguoi' },
      { label: 'Dien tich tu nhien TDM', value: '118,67 km2' },
      { label: 'Thu nhap binh quan (trich dan bao cao tinh)', value: '8,937 trieu dong/thang' },
      { label: 'Ty suat di cu thuan Binh Duong (DSGK 2024)', value: '77,6‰ (cao nhat ca nuoc)' },
    ],
    marketNotes: [
      'Dan so ~3,1 trieu la so uoc tinh hanh chinh dua tren bao cao cuoi nam 2024, co the bien dong manh do nhap cu cao.',
      'Thu nhap binh quan 8,937 trieu dong/thang la so lieu duoc trich dan trong cac bao cao tong ket KT-XH cua tinh.',
    ],
  },
  demographics: {
    age: [
      { group: '18-24', pct: 25 },
      { group: '25-34', pct: 45 },
      { group: '35-44', pct: 20 },
      { group: '45+', pct: 10 },
    ],
    gender: { male: 20, female: 80 },
    genderTargetNote:
      'Ty le gioi tinh muc tieu cho chien dich content/seeding (khong phai co cau dan so tu nhien cua dia ban).',
  },
  behavior: [
    { name: 'Tin tuong Review mxh', score: 95 },
    { name: 'Tinh tien loi (Ship/App)', score: 90 },
    { name: 'Nhay cam ve gia', score: 85 },
    { name: 'Thich Combo tron goi', score: 80 },
  ],
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

function normalizePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return FALLBACK_DEMO_DATA;
    }
  }
  return payload ?? FALLBACK_DEMO_DATA;
}

async function getProfileByUser(
  request: FastifyRequest,
  businessId: string,
  userId: string,
): Promise<StrategyMarketProfileRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyMarketProfileRow[]>`
    SELECT strategy_market_profile_id, business_id, user_id, payload, is_demo, updated_at
    FROM strategy_market_profiles
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getProfileByBusiness(
  request: FastifyRequest,
  businessId: string,
): Promise<StrategyMarketProfileRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyMarketProfileRow[]>`
    SELECT strategy_market_profile_id, business_id, user_id, payload, is_demo, updated_at
    FROM strategy_market_profiles
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: MarketProfileQuery }>,
  reply: FastifyReply,
) {
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyMarketProfileRow | null = null;

  if (effectiveUserId) {
    selected = await getProfileByUser(request, effectiveBusinessId, effectiveUserId);
    if (selected) source = 'user';
  }

  if (!selected) {
    selected = await getProfileByBusiness(request, effectiveBusinessId);
    if (selected) source = selected.business_id === 'demo' ? 'demo' : 'business';
  }

  if (!selected && effectiveBusinessId !== 'demo') {
    selected = await getProfileByBusiness(request, 'demo');
    if (selected) source = 'demo';
  }

  const payload = normalizePayload(selected?.payload);

  return reply.send({
    success: true,
    data: payload,
    meta: {
      source,
      businessId: selected?.business_id ?? 'demo',
      userId: selected?.user_id ?? null,
      usedFallbackDemo: source === 'demo',
      updatedAt: selected?.updated_at?.toISOString?.() ?? null,
    },
  });
}
