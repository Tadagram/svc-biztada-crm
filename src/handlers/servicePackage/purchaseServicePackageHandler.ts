import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { issuePortalLicensesBatch } from '@services/corePortalLicenses';
import { calcBonusLicenseCount } from './servicePackageBonus';
import { resolvePartnerContext } from '@/utils/partnerContext';
import { resolvePartnerSellerUserId } from '@/utils/resolvePartnerSeller';

const CREDIT_PER_USD = new Prisma.Decimal(10);

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
  const partnerContext = resolvePartnerContext(
    request.headers as Record<string, string | string[] | undefined>,
  );
  const sellerUserId = await resolvePartnerSellerUserId(prisma, partnerContext, sellerUserIdInput);
  if (partnerContext.partnerId === 'soloai' && !sellerUserId) {
    return reply.status(400).send({
      success: false,
      message:
        'Missing seller_user_id mapping for soloai. Set x-seller-user-id or configure SOLOAI_SELLER_USER_ID/PARTNER_SELLER_MAP with seller UUID.',
    });
  }
  const sourceChannel = partnerContext.sourceChannel;

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
  const totalPriceCredits = totalPriceUsd.mul(CREDIT_PER_USD);
  const baseLicenseCount = Number(servicePackage.license_key_count) || 0;
  const bonusPercent = Number(servicePackage.agent_discount_percent) || 0;
  const bonusLicenseCount = calcBonusLicenseCount(
    baseLicenseCount,
    bonusPercent,
    servicePackage.type,
  );
  const issuedLicenseCount = baseLicenseCount + bonusLicenseCount;

  try {
    await prisma.$transaction(async (tx: any) => {
      const creditBalance = await tx.userCreditBalances.findUnique({
        where: { user_id: caller.userId },
        select: { available_credits: true },
      });

      const availableCredits = Number(creditBalance?.available_credits?.toString?.() ?? 0);
      if (availableCredits < Number(totalPriceCredits)) {
        throw new Error(
          `Insufficient credits. Need ${totalPriceCredits.toString()} credits, available ${availableCredits.toFixed(2)} credits.`,
        );
      }

      const updatedCreditBalance = await tx.userCreditBalances.update({
        where: { user_id: caller.userId },
        data: { available_credits: { decrement: totalPriceCredits } },
        select: { available_credits: true },
      });

      await tx.creditLedgerEntries.create({
        data: {
          user_id: caller.userId,
          entry_type: 'USAGE',
          direction: 'DEBIT',
          amount: totalPriceCredits,
          balance_after: updatedCreditBalance.available_credits,
          purpose: `Purchase service package ${servicePackage.product_code}`,
          source_channel: sourceChannel,
          metadata: {
            purchase_id: purchaseId,
            service_package_id: servicePackage.service_package_id,
            total_price_usd: totalPriceUsd.toString(),
            partner_id: partnerContext.partnerId,
          },
          created_by: caller.userId,
        },
      });

      await tx.servicePackagePurchases.create({
        data: {
          service_package_purchase_id: purchaseId,
          user_id: caller.userId,
          service_package_id: servicePackage.service_package_id,
          status: 'processing',
          channel: sellerUserId ? 'agency' : 'direct',
          seller_user_id: sellerUserId,
          license_key_count_snapshot: issuedLicenseCount,
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
      // expires_at KHÔNG truyền — key sinh ra với NULL.
      // Expire chỉ bắt đầu tính khi Portal kích hoạt key (ActivateLicense trong Go).
      issued_for_note: coreNoteRef,
      quantity: issuedLicenseCount,
    });

    const [purchase, creditBalance] = await prisma.$transaction([
      prisma.servicePackagePurchases.update({
        where: { service_package_purchase_id: purchaseId },
        data: { status: 'completed' },
        include: {
          service_package: true,
        },
      }),
      prisma.userCreditBalances.findUnique({
        where: { user_id: caller.userId },
        select: { available_credits: true },
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
        base_license_key_count: baseLicenseCount,
        bonus_license_key_count: bonusLicenseCount,
        bonus_percent: bonusPercent,
        total_price_usd: purchase.total_price_usd.toString(),
        total_price_credits: totalPriceCredits.toString(),
        purchased_at: purchase.purchased_at.toISOString(),
        expires_at: expiresAt.toISOString(),
        remaining_credits: creditBalance?.available_credits?.toString() ?? '0',
      },
    });
  } catch (error) {
    const reason = getErrorMessage(error);

    try {
      await prisma.$transaction(async (tx: any) => {
        const refundedBalance = await tx.userCreditBalances.update({
          where: { user_id: caller.userId },
          data: { available_credits: { increment: totalPriceCredits } },
          select: { available_credits: true },
        });

        await tx.creditLedgerEntries.create({
          data: {
            user_id: caller.userId,
            entry_type: 'REFUND',
            direction: 'CREDIT',
            amount: totalPriceCredits,
            balance_after: refundedBalance.available_credits,
            purpose: `Refund service package purchase ${purchaseId}`,
            source_channel: sourceChannel,
            metadata: {
              purchase_id: purchaseId,
              reason,
              partner_id: partnerContext.partnerId,
            },
            created_by: caller.userId,
          },
        });

        await tx.servicePackagePurchases.update({
          where: { service_package_purchase_id: purchaseId },
          data: {
            status: 'failed',
            failure_reason: reason,
          },
        });
      });
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
