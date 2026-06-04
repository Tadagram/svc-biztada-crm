import { FastifyReply, FastifyRequest } from 'fastify';

interface PipelineEngineQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface PipelineEngineRow {
  strategy_pipeline_engine_id: string;
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
      id: 'kanban',
      icon: '📊',
      title: 'CRM Pipeline Board',
      desc: 'Quản lý Lead theo luồng Kanban trực quan.',
      color: 'violet',
    },
    {
      id: 'automation',
      icon: '⚡',
      title: 'ZNS & Sales Automation',
      desc: 'Tự động hóa chăm sóc và nhắc nhở chốt đơn.',
      color: 'rose',
    },
  ],
  kanbanColumns: [],
  leadCards: [],
  znsWorkflowSteps: [],
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Querystring: PipelineEngineQuery }>,
  reply: FastifyReply,
) {
  const { guestId, businessId, userId } = request.query;
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(guestId);
  const effectiveUserId = authUserId ?? sanitizeId(userId);
  const effectiveBusinessId = sanitizeId(businessId) ?? 'demo';

  let source: SourceType = 'demo';
  let rows: PipelineEngineRow[] = [];

  if (effectiveGuestId) {
    rows = await request.prisma.$queryRaw<PipelineEngineRow[]>`
      SELECT strategy_pipeline_engine_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_pipeline_engine
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'guest';
  } else if (effectiveUserId) {
    rows = await request.prisma.$queryRaw<PipelineEngineRow[]>`
      SELECT strategy_pipeline_engine_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_pipeline_engine
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'user';
  } else if (effectiveBusinessId !== 'demo') {
    rows = await request.prisma.$queryRaw<PipelineEngineRow[]>`
      SELECT strategy_pipeline_engine_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_pipeline_engine
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
        id: row.strategy_pipeline_engine_id,
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
