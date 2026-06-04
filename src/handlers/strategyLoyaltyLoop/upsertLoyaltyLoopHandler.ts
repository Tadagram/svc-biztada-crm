import { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';

interface LoyaltyLoopBody {
  guestId?: string;
  businessId?: string;
  userId?: string;
  payload: any;
}

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Body: LoyaltyLoopBody }>,
  reply: FastifyReply,
) {
  const { guestId, businessId, userId, payload } = request.body;
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  
  const effectiveGuestId = sanitizeId(guestId);
  const effectiveUserId = authUserId ?? sanitizeId(userId);
  const effectiveBusinessId = sanitizeId(businessId) ?? 'demo';
  const newId = crypto.randomUUID();

  await request.prisma.$executeRaw`
    UPDATE strategy_loyalty_loop
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL
      AND (
        (guest_id IS NOT NULL AND guest_id = ${effectiveGuestId})
        OR
        (business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId})
        OR
        (business_id = ${effectiveBusinessId} AND user_id IS NULL AND guest_id IS NULL AND ${effectiveUserId} IS NULL AND ${effectiveGuestId} IS NULL)
      )
  `;

  await request.prisma.$executeRaw`
    INSERT INTO strategy_loyalty_loop (strategy_loyalty_loop_id, business_id, user_id, guest_id, payload, is_demo, created_at, updated_at)
    VALUES (
      ${newId},
      ${effectiveBusinessId},
      ${effectiveUserId},
      ${effectiveGuestId},
      ${JSON.stringify(payload)},
      ${effectiveBusinessId === 'demo'},
      NOW(),
      NOW()
    )
  `;

  return reply.send({
    success: true,
    data: { id: newId },
  });
}
