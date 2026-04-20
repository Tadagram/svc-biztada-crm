import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { issuePortalLicensesBatch } from '@services/corePortalLicenses';

interface PurchaseServicePackageBody {
  service_package_id: string;
  seller_user_id?: string | null;
}

function addOneMonth(baseDate: Date): Date {
  const next = new Date(baseDate);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export async function handler(
  request: FastifyRequest<{ Body: PurchaseServicePackageBody }>,
  reply: FastifyReply,
) {
  const prisma = request.prisma as any;
  const caller = request.user;
  const { service_package_id: servicePackageId, seller_user_id: sellerUserIdInput } = request.body;
  const sellerUserId = sellerUserIdInput?.trim() || null;

  const servicePackage = await prisma.servicePackages.findFirst({
    where: {
      service_package_id: servicePackageId,
      is_active: true,
    },
  });

  if (!servicePackage) {
    return reply.status(404).send({
      success: false,
      message: 'Service package not found.',
    });
  }

  const purchaseId = randomUUID();
  const purchasedAt = new Date();
  const expiresAt = addOneMonth(purchasedAt);
  const coreNoteRef = `crm_purchase:${purchaseId}`;
  const totalPriceUsd = new Prisma.Decimal(servicePackage.price_per_month);

  try {
    await prisma.$transaction(async (tx: any) => {
      const user = await tx.users.findUnique({
        where: { user_id: caller.userId },
        select: { balance: true },
      });

      if (!user) {
        throw new Error('User not found.');
      }

      if (Number(user.balance) < Number(totalPriceUsd)) {
        throw new Error('Insufficient USD balance. Please top up before purchasing this package.');
      }

      await tx.users.update({
        where: { user_id: caller.userId },
        data: { balance: { decrement: totalPriceUsd } },
      });

      await tx.servicePackagePurchases.create({
        data: {
          service_package_purchase_id: purchaseId,
          user_id: caller.userId,
          service_package_id: servicePackage.service_package_id,
          status: 'processing',
          channel: sellerUserId ? 'agency' : 'direct',
          seller_user_id: sellerUserId,
          license_key_count_snapshot: servicePackage.license_key_count,
          unit_price_usd: totalPriceUsd,
          total_price_usd: totalPriceUsd,
          currency: 'USD',
          core_note_ref: coreNoteRef,
          purchased_at: purchasedAt,
        },
      });
    });
  } catch (error) {
    return reply.status(400).send({
      success: false,
      message: getErrorMessage(error),
    });
  }

  try {
    await issuePortalLicensesBatch({
      buyer_user_id: caller.userId,
      seller_user_id: sellerUserId ?? undefined,
      expires_at: expiresAt.toISOString(),
      issued_for_note: coreNoteRef,
      quantity: servicePackage.license_key_count,
    });

    const [purchase, user] = await prisma.$transaction([
      prisma.servicePackagePurchases.update({
        where: { service_package_purchase_id: purchaseId },
        data: { status: 'completed' },
        include: {
          service_package: true,
        },
      }),
      prisma.users.findUnique({
        where: { user_id: caller.userId },
        select: { balance: true },
      }),
    ]);

    return reply.status(201).send({
      success: true,
      data: {
        purchase_id: purchase.service_package_purchase_id,
        status: purchase.status,
        channel: purchase.channel,
        seller_user_id: purchase.seller_user_id,
        service_package_id: purchase.service_package_id,
        product_code: purchase.service_package.product_code,
        license_key_count: purchase.license_key_count_snapshot,
        total_price_usd: purchase.total_price_usd.toString(),
        purchased_at: purchase.purchased_at.toISOString(),
        expires_at: expiresAt.toISOString(),
        remaining_balance_usd: user?.balance?.toString() ?? '0',
      },
    });
  } catch (error) {
    const reason = getErrorMessage(error);

    try {
      await prisma.$transaction([
        prisma.users.update({
          where: { user_id: caller.userId },
          data: { balance: { increment: totalPriceUsd } },
        }),
        prisma.servicePackagePurchases.update({
          where: { service_package_purchase_id: purchaseId },
          data: {
            status: 'failed',
            failure_reason: reason,
          },
        }),
      ]);
    } catch (rollbackError) {
      request.log.error(
        { err: rollbackError, purchaseId, userId: caller.userId },
        'Failed to rollback service package purchase after core issuance error',
      );
    }

    request.log.error(
      { err: error, purchaseId, userId: caller.userId },
      'Service package purchase failed',
    );
    return reply.status(502).send({
      success: false,
      message: reason,
    });
  }
}
