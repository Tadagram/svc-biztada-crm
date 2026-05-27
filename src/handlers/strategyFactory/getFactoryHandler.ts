import { FastifyReply, FastifyRequest } from 'fastify';

interface FactoryQuery {
  businessId?: string;
  userId?: string;
}

type SourceType = 'user' | 'business' | 'demo';

interface StrategyFactoryRow {
  strategy_factory_id: string;
  business_id: string;
  user_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

// Payload is a top-level array of content area objects
const FALLBACK_DEMO_DATA = [
  {
    title: 'Group Cong Dong Chu Luc',
    count: '3 Groups',
    volume: '42',
    unit: 'Bai/tuan',
    desc: 'Nuoi cong dong theo truc suc khoe - phu nu - gia dinh de keo thao luan tu nhien.',
    postingFrequency: '2 bai moi/ngay/group + 1 bai ghim chuyen de/tuan',
    avgEngagement: '140-220 tuong tac/bai (comment + reaction)',
    tag: 'Community SEO',
    details: [
      { name: 'Group 1 - Song Khoe Moi Ngay', topics: 'Noi dung loi ich dinh duong cua trai cay cao cap, thuc don thanh loc.', postingFrequency: '2 bai/ngay', avgEngagement: '160-230 tuong tac/bai' },
      { name: 'Group 2 - Phu Nu Dep Tu Ben Trong', topics: 'Beauty routine bang trai cay, giu dang sau sinh, detox nhe cho nu van phong.', postingFrequency: '2 bai/ngay', avgEngagement: '130-210 tuong tac/bai' },
      { name: 'Group 3 - Bep Nha Co Trai Cay', topics: 'Thuc don gia dinh co tre nho/nguoi lon tuoi, bua phu lanh manh.', postingFrequency: '2 bai/ngay', avgEngagement: '120-190 tuong tac/bai' },
    ],
  },
  {
    title: 'Fanpage San Sales Trai Cay Cao Cap',
    count: '1 Fanpage + 6 ve tinh ho tro',
    volume: '56',
    unit: 'Bai/tuan',
    desc: 'Danh manh nhu cau mua nhanh bang noi dung deal gio vang, hop qua cao cap va review khach that.',
    postingFrequency: '6-8 bai/ngay (khung 7h, 11h30, 16h, 20h)',
    avgEngagement: '180-320 tuong tac/bai deal tot',
    tag: 'Sales Booster',
    details: [
      { name: 'Nhom noi dung 1 - Deal Nhanh Trong Ngay', topics: 'Flash sale theo khung gio, combo tiet kiem theo ngan sach.', postingFrequency: '3 bai/ngay', avgEngagement: '220-340 tuong tac/bai' },
      { name: 'Nhom noi dung 2 - Qua Tang & Bieu Tang', topics: 'Set qua cho doi tac/gia dinh, hop trai cay premium theo dip.', postingFrequency: '2 bai/ngay', avgEngagement: '150-260 tuong tac/bai' },
      { name: 'Nhom noi dung 3 - Review Chat Luong Thuc Te', topics: 'Feedback khach that, video cat thu tai kho, so sanh do tuoi.', postingFrequency: '1-2 bai/ngay', avgEngagement: '160-280 tuong tac/bai' },
    ],
  },
  {
    title: 'Kenh TikTok Ve Tinh Chuyen Doi',
    count: '3 Kenh',
    volume: '27',
    unit: 'Video/tuan',
    desc: 'Tap trung video ngan giau cam xuc va bang chung chat luong de keo lead ve fanpage va chatbot.',
    postingFrequency: 'Moi kenh 1-2 video/ngay',
    avgEngagement: '2.5k-8k views/video, 120-350 tuong tac/video',
    tag: 'Short Video',
    details: [
      { name: 'TikTok 1 - Trai Cay & Suc Khoe', topics: 'Tip an trai cay dung thoi diem, cong thuc nuoc ep/overnight.', postingFrequency: '2 video/ngay', avgEngagement: '150-300 tuong tac/video' },
      { name: 'TikTok 2 - Phu Nu Ban Ron', topics: 'Routine giu dang voi trai cay, hop snack lanh manh cho dan van phong.', postingFrequency: '1-2 video/ngay', avgEngagement: '130-260 tuong tac/video' },
      { name: 'TikTok 3 - Bua Nha & Gia Dinh', topics: 'Goi y bua phu cho tre, khay trai cay cuoi tuan cho gia dinh.', postingFrequency: '1-2 video/ngay', avgEngagement: '120-240 tuong tac/video' },
    ],
  },
];

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

async function getFactoryByUser(
  request: FastifyRequest,
  businessId: string,
  userId: string,
): Promise<StrategyFactoryRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyFactoryRow[]>`
    SELECT strategy_factory_id, business_id, user_id, payload, is_demo, updated_at
    FROM strategy_factory
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getFactoryByBusiness(
  request: FastifyRequest,
  businessId: string,
): Promise<StrategyFactoryRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyFactoryRow[]>`
    SELECT strategy_factory_id, business_id, user_id, payload, is_demo, updated_at
    FROM strategy_factory
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: FactoryQuery }>,
  reply: FastifyReply,
) {
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyFactoryRow | null = null;

  if (effectiveUserId) {
    selected = await getFactoryByUser(request, effectiveBusinessId, effectiveUserId);
    if (selected) source = 'user';
  }

  if (!selected) {
    selected = await getFactoryByBusiness(request, effectiveBusinessId);
    if (selected) source = selected.business_id === 'demo' ? 'demo' : 'business';
  }

  if (!selected && effectiveBusinessId !== 'demo') {
    selected = await getFactoryByBusiness(request, 'demo');
    if (selected) source = 'demo';
  }

  const payload = normalizePayload(selected?.payload);

  return reply.send({
    success: true,
    data: payload,
    meta: {
      source,
      businessId: effectiveBusinessId,
      userId: effectiveUserId ?? null,
      usedFallbackDemo: !selected,
      updatedAt: selected?.updated_at?.toISOString() ?? null,
    },
  });
}
