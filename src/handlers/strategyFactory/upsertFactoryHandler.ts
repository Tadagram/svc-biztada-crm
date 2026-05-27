import { FastifyReply, FastifyRequest } from 'fastify';

interface UpsertFactoryBody {
  payload: unknown;
  businessId?: string;
  userId?: string;
}

interface StrategyFactoryRow {
  strategy_factory_id: string;
}

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Body: UpsertFactoryBody }>,
  reply: FastifyReply,
) {
  const { payload, businessId: bodyBusinessId, userId: bodyUserId } = request.body;

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? sanitizeId(bodyUserId);
  const effectiveBusinessId = sanitizeId(bodyBusinessId) ?? 'demo';

  const payloadJson = JSON.stringify(payload ?? {});

  let existing: StrategyFactoryRow[];
  if (effectiveUserId !== null) {
    existing = await request.prisma.$queryRaw<StrategyFactoryRow[]>`
      SELECT strategy_factory_id
      FROM strategy_factory
      WHERE deleted_at IS NULL
        AND business_id = ${effectiveBusinessId}
        AND user_id = ${effectiveUserId}
      LIMIT 1
    `;
  } else {
    existing = await request.prisma.$queryRaw<StrategyFactoryRow[]>`
      SELECT strategy_factory_id
      FROM strategy_factory
      WHERE deleted_at IS NULL
        AND business_id = ${effectiveBusinessId}
        AND user_id IS NULL
      LIMIT 1
    `;
  }

  let created = false;
  let rowId: string;

  if (existing.length > 0) {
    rowId = existing[0].strategy_factory_id;
    await request.prisma.$executeRaw`
      UPDATE strategy_factory
      SET payload = ${payloadJson}, updated_at = NOW()
      WHERE strategy_factory_id = ${rowId}
    `;
  } else {
    const newId = crypto.randomUUID();
    await request.prisma.$executeRaw`
      INSERT INTO strategy_factory
        (strategy_factory_id, business_id, user_id, payload, is_demo, created_at, updated_at)
      VALUES (
        ${newId},
        ${effectiveBusinessId},
        ${effectiveUserId},
        ${payloadJson},
        ${effectiveBusinessId === 'demo' ? 1 : 0},
        NOW(),
        NOW()
      )
    `;
    rowId = newId;
    created = true;
  }

  return reply.send({
    success: true,
    data: payload,
    meta: {
      created,
      id: rowId,
      businessId: effectiveBusinessId,
      userId: effectiveUserId,
    },
  });
}
