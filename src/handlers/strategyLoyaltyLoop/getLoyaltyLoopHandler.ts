import { FastifyReply, FastifyRequest } from 'fastify';

interface LoyaltyLoopQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface LoyaltyLoopRow {
  strategy_loyalty_loop_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

// TODO: Replace with actual mock data from frontend
const FALLBACK_DEMO_DATA = {
  features: [
    {
      id: 'tagging',
      icon: '🏷️',
      title: 'Phân Khúc & Tagging',
      desc: 'Hệ thống hóa dữ liệu khách hàng cũ.',
      color: 'emerald',
    },
    {
      id: 'broadcast',
      icon: '📢',
      title: 'Re-marketing Tự Động',
      desc: 'Gửi ZNS mùa vụ & chăm sóc định kỳ.',
      color: 'amber',
    },
    {
      id: 'viral_loop',
      icon: '♾️',
      title: 'Vòng Lặp Lan Truyền',
      desc: 'Biến khách quen thành người giới thiệu.',
      color: 'rose',
    },
  ],
  customerSegments: [],
  znsCampaignPreview: [],
  viralLoopSteps: [],
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Querystring: LoyaltyLoopQuery }>,
  reply: FastifyReply,
) {
  const { guestId, businessId, userId } = request.query;
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(guestId);
  const effectiveUserId = authUserId ?? sanitizeId(userId);
  const effectiveBusinessId = sanitizeId(businessId) ?? 'demo';

  let source: SourceType = 'demo';
  let rows: LoyaltyLoopRow[] = [];

  if (effectiveGuestId) {
    rows = await request.prisma.$queryRaw<LoyaltyLoopRow[]>`
      SELECT strategy_loyalty_loop_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_loyalty_loop
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'guest';
  } else if (effectiveUserId) {
    rows = await request.prisma.$queryRaw<LoyaltyLoopRow[]>`
      SELECT strategy_loyalty_loop_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_loyalty_loop
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'user';
  } else if (effectiveBusinessId !== 'demo') {
    rows = await request.prisma.$queryRaw<LoyaltyLoopRow[]>`
      SELECT strategy_loyalty_loop_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_loyalty_loop
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'business';
  }

  if (rows.length > 0) {
    const row = rows[0];
    return reply.send({
      success: true,
      data: row.payload,
      meta: {
        source,
        id: row.strategy_loyalty_loop_id,
        businessId: row.business_id,
        userId: row.user_id,
        guestId: row.guest_id,
        isDemo: Boolean(row.is_demo),
        updatedAt: row.updated_at,
        usedFallbackDemo: false,
      },
    });
  }

  return reply.send({
    success: true,
    data: FALLBACK_DEMO_DATA,
    meta: {
      source: 'demo',
      id: null,
      businessId: effectiveBusinessId,
      userId: effectiveUserId,
      guestId: effectiveGuestId,
      isDemo: true,
      updatedAt: new Date().toISOString(),
      usedFallbackDemo: true,
    },
  });
}
