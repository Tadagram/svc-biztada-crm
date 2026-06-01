import { FastifyRequest, FastifyReply } from 'fastify';

interface ClaimGuestBody {
  guestId: string;
}

interface ClaimResult {
  claimed: boolean;
  guestId: string;
  userId: string;
  migrated: {
    market_profiles: number;
    action_plans: number;
    features: number;
    matrix: number;
    factory: number;
    session_logs: number;
  };
}

/**
 * POST /strategy/claim-guest
 *
 * Atomically migrates all strategy data from a guest session to an authenticated user.
 * Called once when a guest creates a Biztada account.
 *
 * Flow:
 *   1. Verify guest exists and is not already deleted (already claimed)
 *   2. Check that any strategy data exists for this guest (idempotent guard)
 *   3. UPDATE all 5 strategy tables: SET user_id = userId WHERE guest_id = guestId AND user_id IS NULL
 *   4. UPDATE strategy_session_logs: SET user_id = userId WHERE guest_id = guestId AND user_id IS NULL
 *   5. Soft-delete the guests_info record
 *   6. Return row counts for observability
 *
 * Identity: JWT userId required (or ?userId query param for internal calls from svc-core-api).
 */
export async function claimGuestHandler(
  request: FastifyRequest<{
    Body: ClaimGuestBody;
    Querystring: { userId?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const { guestId } = request.body;

  const authUser = request.user as { userId?: string } | undefined;
  const userId = authUser?.userId ?? request.query.userId ?? null;

  if (!userId) {
    return reply.status(401).send({ error: 'userId is required — must be authenticated' });
  }

  // ── 1. Verify guest exists ──────────────────────────────────────────────────
  interface GuestRow { guest_id: string }
  const guestRows = await request.prisma.$queryRaw<GuestRow[]>`
    SELECT guest_id
    FROM guests_info
    WHERE guest_id = ${guestId}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  if (guestRows.length === 0) {
    // Guest not found or already claimed — treat as idempotent success if user already owns data
    const alreadyClaimed = await request.prisma.strategySessionLog.count({
      where: { user_id: userId },
    });
    if (alreadyClaimed > 0) {
      return reply.status(200).send({
        claimed: true,
        guestId,
        userId,
        migrated: { market_profiles: 0, action_plans: 0, features: 0, matrix: 0, factory: 0, session_logs: 0 },
      });
    }
    return reply.status(404).send({ error: 'Guest not found or already claimed' });
  }

  // ── 2. Migrate all tables (raw SQL for atomic bulk UPDATE) ─────────────────
  // Prisma doesn't expose updateMany with a WHERE on a nullable field cleanly,
  // so we use $executeRaw for each table.
  let marketCount: number;
  let planCount: number;
  let featuresCount: number;
  let matrixCount: number;
  let factoryCount: number;
  let logsCount: number;

  try {
    [marketCount, planCount, featuresCount, matrixCount, factoryCount, logsCount] =
      await request.prisma.$transaction(async (tx) => {
        const mkt = await tx.$executeRaw`
          UPDATE strategy_market_profiles
          SET user_id = ${userId}, updated_at = NOW()
          WHERE guest_id = ${guestId} AND user_id IS NULL AND deleted_at IS NULL
        `;
        const plan = await tx.$executeRaw`
          UPDATE strategy_action_plans
          SET user_id = ${userId}, updated_at = NOW()
          WHERE guest_id = ${guestId} AND user_id IS NULL AND deleted_at IS NULL
        `;
        const feat = await tx.$executeRaw`
          UPDATE strategy_features
          SET user_id = ${userId}, updated_at = NOW()
          WHERE guest_id = ${guestId} AND user_id IS NULL AND deleted_at IS NULL
        `;
        const mtx = await tx.$executeRaw`
          UPDATE strategy_matrix
          SET user_id = ${userId}, updated_at = NOW()
          WHERE guest_id = ${guestId} AND user_id IS NULL AND deleted_at IS NULL
        `;
        const fct = await tx.$executeRaw`
          UPDATE strategy_factory
          SET user_id = ${userId}, updated_at = NOW()
          WHERE guest_id = ${guestId} AND user_id IS NULL AND deleted_at IS NULL
        `;
        const logs = await tx.$executeRaw`
          UPDATE strategy_session_logs
          SET user_id = ${userId}
          WHERE guest_id = ${guestId} AND user_id IS NULL
        `;
        // Soft-delete the guest record
        await tx.$executeRaw`
          UPDATE guests_info
          SET deleted_at = NOW(), updated_at = NOW()
          WHERE guest_id = ${guestId}
        `;
        return [mkt, plan, feat, mtx, fct, logs];
      });
  } catch (err) {
    request.log.error({ err, guestId, userId }, '[claimGuest] transaction failed');
    return reply.status(500).send({ error: 'Failed to migrate guest data' });
  }

  const result: ClaimResult = {
    claimed: true,
    guestId,
    userId,
    migrated: {
      market_profiles: marketCount,
      action_plans: planCount,
      features: featuresCount,
      matrix: matrixCount,
      factory: factoryCount,
      session_logs: logsCount,
    },
  };

  request.log.info(result, '[claimGuest] guest data migrated to user');
  reply.status(200).send(result);
}
