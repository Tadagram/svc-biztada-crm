import { FastifyReply, FastifyRequest } from 'fastify';

interface UpsertMatrixBody {
  payload: unknown;
  guestId?: string;
  businessId?: string;
  userId?: string;
}

interface StrategyMatrixRow {
  strategy_matrix_id: string;
}

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Body: UpsertMatrixBody }>,
  reply: FastifyReply,
) {
  const { payload, guestId: bodyGuestId, businessId: bodyBusinessId, userId: bodyUserId } = request.body;

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(bodyGuestId);
  const effectiveUserId = authUserId ?? sanitizeId(bodyUserId);
  const effectiveBusinessId = sanitizeId(bodyBusinessId) ?? 'demo';

  const payloadJson = JSON.stringify(payload ?? {});

  // Guest path: upsert by guest_id only
  if (effectiveGuestId) {
    const existing = await request.prisma.$queryRaw<StrategyMatrixRow[]>`
      SELECT strategy_matrix_id
      FROM strategy_matrix
      WHERE deleted_at IS NULL
        AND guest_id = ${effectiveGuestId}
      LIMIT 1
    `;
    let created = false;
    let rowId: string;
    if (existing.length > 0) {
      rowId = existing[0].strategy_matrix_id;
      await request.prisma.$executeRaw`
        UPDATE strategy_matrix
        SET payload = ${payloadJson}, updated_at = NOW()
        WHERE strategy_matrix_id = ${rowId}
      `;
    } else {
      const newId = crypto.randomUUID();
      await request.prisma.$executeRaw`
        INSERT INTO strategy_matrix
          (strategy_matrix_id, business_id, user_id, guest_id, payload, is_demo, created_at, updated_at)
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

  // Legacy path: upsert by (business_id, user_id)
  let existing: StrategyMatrixRow[];
  if (effectiveUserId !== null) {
    existing = await request.prisma.$queryRaw<StrategyMatrixRow[]>`
      SELECT strategy_matrix_id
      FROM strategy_matrix
      WHERE deleted_at IS NULL
        AND business_id = ${effectiveBusinessId}
        AND user_id = ${effectiveUserId}
      LIMIT 1
    `;
  } else {
    existing = await request.prisma.$queryRaw<StrategyMatrixRow[]>`
      SELECT strategy_matrix_id
      FROM strategy_matrix
      WHERE deleted_at IS NULL
        AND business_id = ${effectiveBusinessId}
        AND user_id IS NULL
      LIMIT 1
    `;
  }

  let created = false;
  let rowId: string;

  if (existing.length > 0) {
    rowId = existing[0].strategy_matrix_id;
    await request.prisma.$executeRaw`
      UPDATE strategy_matrix
      SET payload = ${payloadJson}, updated_at = NOW()
      WHERE strategy_matrix_id = ${rowId}
    `;
  } else {
    const newId = crypto.randomUUID();
    await request.prisma.$executeRaw`
      INSERT INTO strategy_matrix
        (strategy_matrix_id, business_id, user_id, guest_id, payload, is_demo, created_at, updated_at)
      VALUES (
        ${newId},
        ${effectiveBusinessId},
        ${effectiveUserId},
        NULL,
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
