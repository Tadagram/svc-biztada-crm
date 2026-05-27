import { FastifyReply, FastifyRequest } from 'fastify';

interface MatrixQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategyMatrixRow {
  strategy_matrix_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

// Payload is a top-level array of persona objects
const FALLBACK_DEMO_DATA = [
  {
    id: 'p1',
    name: 'Me Bim Sua',
    count: 60,
    ratio: '27',
    color: 'from-pink-500 to-rose-600',
    hexColor: '#ec4899',
    icon: 'users',
    focus: 'Dang hoi dap, xin review thuc te ve an toan cho tre nho.',
    purpose: 'Chiu trach nhiem cao cu cam xuc, danh vao tam ly lo lang.',
    stats: { 'To mo & Hoc hoi': 85, 'Dong cam': 90, 'Phan bien nhe': 45, 'Kich dong mua': 65, 'Thao tung tam ly': 75 },
  },
  {
    id: 'p2',
    name: 'Reviewer Local',
    count: 50,
    ratio: '23',
    color: 'from-emerald-500 to-teal-600',
    hexColor: '#10b981',
    icon: 'activity',
    focus: 'La ca hang quan, check-in, khoe deal mua sam khu vuc.',
    purpose: 'Dong vai nguoi mang tin chat luong.',
    stats: { 'To mo & Hoc hoi': 60, 'Dong cam': 50, 'Phan bien nhe': 85, 'Kich dong mua': 95, 'Thao tung tam ly': 80 },
  },
  {
    id: 'p3',
    name: 'Gia Dinh Hien Dai',
    count: 40,
    ratio: '18',
    color: 'from-blue-500 to-indigo-600',
    hexColor: '#3b82f6',
    icon: 'target',
    focus: 'Khen toc do giao hang, dich vu hau mai.',
    purpose: 'Lam tang uy tin ve dich vu va van hanh ship hang.',
    stats: { 'To mo & Hoc hoi': 70, 'Dong cam': 80, 'Phan bien nhe': 30, 'Kich dong mua': 50, 'Thao tung tam ly': 40 },
  },
  {
    id: 'p4',
    name: 'Chuyen gia Dinh Duong',
    count: 70,
    ratio: '32',
    color: 'from-amber-500 to-orange-600',
    hexColor: '#f59e0b',
    icon: 'brain',
    focus: 'Phan tich thanh phan, do sach chung chi organic.',
    purpose: 'Tao trust tuyet doi dua tren goc nhin khoa hoc.',
    stats: { 'To mo & Hoc hoi': 95, 'Dong cam': 40, 'Phan bien nhe': 90, 'Kich dong mua': 60, 'Thao tung tam ly': 100 },
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

async function getMatrixByGuest(
  request: FastifyRequest,
  guestId: string,
): Promise<StrategyMatrixRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyMatrixRow[]>`
    SELECT strategy_matrix_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_matrix
    WHERE deleted_at IS NULL
      AND guest_id = ${guestId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getMatrixByUser(
  request: FastifyRequest,
  businessId: string,
  userId: string,
): Promise<StrategyMatrixRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyMatrixRow[]>`
    SELECT strategy_matrix_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_matrix
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getMatrixByBusiness(
  request: FastifyRequest,
  businessId: string,
): Promise<StrategyMatrixRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyMatrixRow[]>`
    SELECT strategy_matrix_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_matrix
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: MatrixQuery }>,
  reply: FastifyReply,
) {
  const queryGuestId = sanitizeId(request.query.guestId);
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyMatrixRow | null = null;

  if (queryGuestId) {
    selected = await getMatrixByGuest(request, queryGuestId);
    if (selected) source = 'guest';
  }

  if (!selected && effectiveUserId) {
    selected = await getMatrixByUser(request, effectiveBusinessId, effectiveUserId);
    if (selected) source = 'user';
  }

  if (!selected) {
    selected = await getMatrixByBusiness(request, effectiveBusinessId);
    if (selected) source = selected.business_id === 'demo' ? 'demo' : 'business';
  }

  if (!selected && effectiveBusinessId !== 'demo') {
    selected = await getMatrixByBusiness(request, 'demo');
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
