import { FastifyReply, FastifyRequest } from 'fastify';

interface UpsertBrandlabsBody {
  payload: unknown;
  guestId?: string;
  businessId?: string;
  userId?: string;
}

interface StrategyBrandlabsRow {
  strategy_brandlabs_id: string;
}

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Body: UpsertBrandlabsBody }>,
  reply: FastifyReply,
) {
  const { payload, guestId: bodyGuestId, businessId: bodyBusinessId, userId: bodyUserId } = request.body;

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(bodyGuestId);
  const effectiveUserId = authUserId ?? sanitizeId(bodyUserId);
  const effectiveBusinessId = sanitizeId(bodyBusinessId) ?? 'demo';

  const payloadJson = JSON.stringify(payload ?? {});

  // Guest path
  if (effectiveGuestId) {
    const existing = await request.prisma.$queryRaw<StrategyBrandlabsRow[]>`
      SELECT strategy_brandlabs_id FROM strategy_brandlabs
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId} LIMIT 1
    `;
    let created = false;
    let rowId: string;
    if (existing.length > 0) {
      rowId = existing[0].strategy_brandlabs_id;
      await request.prisma.$executeRaw`
        UPDATE strategy_brandlabs SET payload = ${payloadJson}, updated_at = NOW()
        WHERE strategy_brandlabs_id = ${rowId}
      `;
    } else {
      const newId = crypto.randomUUID();
      await request.prisma.$executeRaw`
        INSERT INTO strategy_brandlabs
          (strategy_brandlabs_id, business_id, user_id, guest_id, payload, is_demo, created_at, updated_at)
        VALUES (${newId}, 'guest', NULL, ${effectiveGuestId}, ${payloadJson}, 0, NOW(), NOW())
      `;
      rowId = newId;
      created = true;
    }
    return reply.send({
      success: true,
      data: payload,
      meta: { created, id: rowId, guestId: effectiveGuestId, businessId: null, userId: null },
    });
  }

  // Legacy path
  let existing: StrategyBrandlabsRow[];
  if (effectiveUserId !== null) {
    existing = await request.prisma.$queryRaw<StrategyBrandlabsRow[]>`
      SELECT strategy_brandlabs_id FROM strategy_brandlabs
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId} LIMIT 1
    `;
  } else {
    existing = await request.prisma.$queryRaw<StrategyBrandlabsRow[]>`
      SELECT strategy_brandlabs_id FROM strategy_brandlabs
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id IS NULL LIMIT 1
    `;
  }

  let created = false;
  let rowId: string;

  if (existing.length > 0) {
    rowId = existing[0].strategy_brandlabs_id;
    await request.prisma.$executeRaw`
      UPDATE strategy_brandlabs SET payload = ${payloadJson}, updated_at = NOW()
      WHERE strategy_brandlabs_id = ${rowId}
    `;
  } else {
    const newId = crypto.randomUUID();
    await request.prisma.$executeRaw`
      INSERT INTO strategy_brandlabs
        (strategy_brandlabs_id, business_id, user_id, guest_id, payload, is_demo, created_at, updated_at)
      VALUES (
        ${newId}, ${effectiveBusinessId}, ${effectiveUserId}, NULL,
        ${payloadJson}, ${effectiveBusinessId === 'demo' ? 1 : 0}, NOW(), NOW()
      )
    `;
    rowId = newId;
    created = true;
  }

  return reply.send({
    success: true,
    data: payload,
    meta: { created, id: rowId, businessId: effectiveBusinessId, userId: effectiveUserId },
  });
}
