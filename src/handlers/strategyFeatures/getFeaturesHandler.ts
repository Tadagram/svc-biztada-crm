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
  scenarios: [
    {
      id: 'sc-1',
      title: 'Kich ban 1: Thu thap tai nguyen -> San xuat remake -> Cham soc kenh',
      desc: 'Luong noi dung van hanh dinh ky giua Marketing va BrandLabs cho cac kenh muc tieu.',
      steps: [
        'Marketing thu thap tai nguyen tu kenh muc tieu va luu kho du lieu noi dung.',
        'BrandLabs lay tai lieu tu kho theo tung nhan vat cu the de tao remake noi dung tu dong.',
        'Marketing nhan noi dung tu BrandLabs, post bai dinh ky cham soc Profile FB, Group FB va TikTok.',
      ],
    },
    {
      id: 'sc-2',
      title: 'Kich ban 2: Seeding account bam content tao FOMO',
      desc: 'Luong tang tuong tac tu nhien bang hanh vi da tinh cach tren tung noi dung muc tieu.',
      steps: [
        'Marketing day seeding accounts bam theo cac content tu Kich ban 1.',
        'Moi account tuong tac theo tinh cach va hanh vi rieng: comment, reply, like, share.',
        'Hieu ung FOMO duoc tao ra de bai post muc tieu va kenh muc tieu tro nen sinh dong hon.',
      ],
    },
    {
      id: 'sc-3',
      title: 'Kich ban 3: Phat hien nhu cau mua hang -> Day CRM',
      desc: 'Luong chuyen doi tu tuong tac cong dong sang du lieu khach hang co nhu cau.',
      steps: [
        'Marketing theo doi tuong tac de phat hien nguoi dung co tin hieu nhu cau mua hang.',
        'Tin hieu nhu cau duoc chuan hoa thanh lead du dieu kien.',
        'Thong tin lead duoc chuyen ve CRM de luu danh sach va phan loai theo campaign.',
      ],
    },
    {
      id: 'sc-4',
      title: 'Kich ban 4: Chatbot nhan lead CRM -> Tu van -> Chot don',
      desc: 'Luong chot don chu dong tu danh sach lead da duoc CRM xac nhan.',
      steps: [
        'Chatbot nhan danh sach leads tu CRM theo muc do uu tien.',
        'Chatbot chu dong tuong tac tu van theo kich ban san pham va lich su hanh vi.',
        'Ket qua chot don duoc cap nhat nguoc ve CRM de hoan tat vong doi don hang.',
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
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return FALLBACK_DEMO_DATA;
    }
  }
  return payload ?? FALLBACK_DEMO_DATA;
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
