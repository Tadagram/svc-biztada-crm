import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, UserStatus } from '@prisma/client';
import notificationEmitter from '@plugins/notificationEmitter';

interface ExecutePromotionParams {
  promotionId: string;
}

const BATCH_SIZE = 50;

async function getTargetUserIds(
  prisma: PrismaClient,
  promotionId: string,
  targetType: string,
): Promise<string[]> {
  if (targetType === 'custom') {
    const targets = await prisma.promotionUserTargets.findMany({
      where: { promotion_id: promotionId },
      select: { user_id: true },
    });
    return targets.map((t) => t.user_id);
  }

  // target_type === 'all': all active, non-deleted users
  const users = await prisma.users.findMany({
    where: { deleted_at: null, status: UserStatus.active },
    select: { user_id: true },
  });
  return users.map((u) => u.user_id);
}

async function processOneUser(
  prisma: PrismaClient,
  promotionId: string,
  userId: string,
  creditAmount: import('@prisma/client').Prisma.Decimal,
  message: string,
  executorId: string,
  logger: { error: (...args: any[]) => void },
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      // Upsert credit balance
      const balanceRecord = await tx.userCreditBalances.upsert({
        where: { user_id: userId },
        update: { available_credits: { increment: creditAmount } },
        create: { user_id: userId, available_credits: creditAmount },
        select: { available_credits: true },
      });

      // Create ledger entry
      await tx.creditLedgerEntries.create({
        data: {
          user_id: userId,
          entry_type: 'ADJUSTMENT',
          direction: 'CREDIT',
          amount: creditAmount,
          balance_after: balanceRecord.available_credits,
          purpose: 'Promotion credit',
          created_by: executorId,
          metadata: { promotion_id: promotionId, message },
        },
      });

      // Create notification
      const notification = await tx.notifications.create({
        data: {
          recipient_id: userId,
          sender_id: executorId,
          type: 'custom',
          title: 'Bạn nhận được credit khuyến mãi!',
          body: message,
          custom_fields: { promotion_id: promotionId, credit_amount: creditAmount.toString() },
        },
      });

      // Create execution log
      await tx.promotionExecutionLogs.create({
        data: {
          promotion_id: promotionId,
          user_id: userId,
          credit_amount: creditAmount,
          notified: true,
        },
      });

      // Emit SSE after transaction commits (setImmediate fires after $transaction resolves)
      setImmediate(() => {
        notificationEmitter.emit('notification_event', {
          event: 'notification_event',
          notification_id: notification.notification_id,
          recipient_id: notification.recipient_id,
          sender_id: notification.sender_id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          action_url: null,
          custom_fields:
            notification.custom_fields && typeof notification.custom_fields === 'object'
              ? (notification.custom_fields as Record<string, unknown>)
              : null,
          created_at: notification.created_at.toISOString(),
        });
      });
    });
    return true;
  } catch (err) {
    logger.error(
      { err, promotionId, userId },
      '[ExecutePromotion] Failed to process user — skipping',
    );
    return false;
  }
}

async function processBatch(
  prisma: PrismaClient,
  promotionId: string,
  userIds: string[],
  creditAmount: import('@prisma/client').Prisma.Decimal,
  message: string,
  executorId: string,
  logger: { error: (...args: any[]) => void },
): Promise<number> {
  let successCount = 0;
  for (const userId of userIds) {
    const ok = await processOneUser(prisma, promotionId, userId, creditAmount, message, executorId, logger);
    if (ok) successCount++;
  }
  return successCount;
}

export async function handler(
  request: FastifyRequest<{ Params: ExecutePromotionParams }>,
  reply: FastifyReply,
) {
  const { prisma, log: logger } = request;
  const caller = request.user;
  const { promotionId } = request.params;

  const promotion = await prisma.promotions.findUnique({
    where: { promotion_id: promotionId },
    select: {
      promotion_id: true,
      name: true,
      message: true,
      credit_amount: true,
      target_type: true,
      status: true,
    },
  });

  if (!promotion) {
    return reply.status(404).send({ success: false, message: 'Promotion not found' });
  }

  if (promotion.status !== 'draft') {
    return reply.status(409).send({
      success: false,
      message: 'Promotion has already been executed or cancelled',
    });
  }

  // Mark as executing (optimistic lock via status change)
  const locked = await prisma.promotions.updateMany({
    where: { promotion_id: promotionId, status: 'draft' },
    data: {
      status: 'executed',
      executed_by: caller.userId,
      executed_at: new Date(),
    },
  });

  if (locked.count === 0) {
    return reply.status(409).send({
      success: false,
      message: 'Promotion was already executed by another request',
    });
  }

  const targetUserIds = await getTargetUserIds(prisma, promotionId, promotion.target_type);

  if (targetUserIds.length === 0) {
    return reply.send({ success: true, credited_count: 0 });
  }

  // Process in batches — each user is independently fault-tolerant
  let totalCredited = 0;
  for (let i = 0; i < targetUserIds.length; i += BATCH_SIZE) {
    const batch = targetUserIds.slice(i, i + BATCH_SIZE);
    const batchSuccess = await processBatch(
      prisma,
      promotionId,
      batch,
      promotion.credit_amount,
      promotion.message,
      caller.userId,
      logger,
    );
    totalCredited += batchSuccess;
  }

  return reply.send({ success: true, credited_count: totalCredited });
}
