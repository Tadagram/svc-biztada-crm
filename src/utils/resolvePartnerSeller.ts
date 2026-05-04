import { PrismaClient } from '@prisma/client';
import type { PartnerContext } from './partnerContext';

export async function resolvePartnerSellerUserId(
  prisma: PrismaClient,
  partnerContext: PartnerContext,
  explicitSellerUserId?: string | null,
): Promise<string | null> {
  void prisma;

  const explicit = explicitSellerUserId?.trim();
  if (explicit) return explicit;

  if (partnerContext.sellerUserId) {
    return partnerContext.sellerUserId;
  }

  return null;
}
