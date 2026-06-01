import { FastifyReply, FastifyRequest } from 'fastify';

interface UpsertDirectionBody {
  payload: unknown;
  guestId?: string;
  businessId?: string;
  userId?: string;
}

interface StrategyDirectionRow {
  strategy_direction_id: string;
}

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Body: UpsertDirectionBody }>,
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
    const existing = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id FROM strategy_direction
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId} LIMIT 1
    `;
    let created = false;
    let rowId: string;
    if (existing.length > 0) {
      rowId = existing[0].strategy_direction_id;
      await request.prisma.$executeRaw`
        UPDATE strategy_direction SET payload = ${payloadJson}, updated_at = NOW()
        WHERE strategy_direction_id = ${rowId}
      `;
    } else {
      const newId = crypto.randomUUID();
      await request.prisma.$executeRaw`
        INSERT INTO strategy_direction
          (strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, created_at, updated_at)
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
  let existing: StrategyDirectionRow[];
  if (effectiveUserId !== null) {
    existing = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id FROM strategy_direction
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId} LIMIT 1
    `;
  } else {
    existing = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id FROM strategy_direction
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id IS NULL LIMIT 1
    `;
  }

  let created = false;
  let rowId: string;
  if (existing.length > 0) {
    rowId = existing[0].strategy_direction_id;
    await request.prisma.$executeRaw`
      UPDATE strategy_direction SET payload = ${payloadJson}, updated_at = NOW()
      WHERE strategy_direction_id = ${rowId}
    `;
  } else {
    const newId = crypto.randomUUID();
    await request.prisma.$executeRaw`
      INSERT INTO strategy_direction
        (strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, created_at, updated_at)
      VALUES (${newId}, ${effectiveBusinessId}, ${effectiveUserId}, NULL, ${payloadJson}, 0, NOW(), NOW())
    `;
    rowId = newId;
    created = true;
  }

  return reply.send({
    success: true,
    data: payload,
    meta: { created, id: rowId, guestId: null, businessId: effectiveBusinessId, userId: effectiveUserId },
  });
}
