import { PrismaClient } from '@prisma/client';
import type { PartnerContext } from './partnerContext';

/**
 * Resolve seller user ID for a transaction.
 * Falls back to platform admin (first mod user) when no seller is specified.
 * This allows partners to operate without seller mapping initially.
 */
export async function resolvePartnerSellerUserId(
  prisma: PrismaClient,
  partnerContext: PartnerContext,
  explicitSellerUserId?: string | null,
): Promise<string | null> {
  const explicit = explicitSellerUserId?.trim();
  if (explicit) return explicit;

  if (partnerContext.sellerUserId) {
    return partnerContext.sellerUserId;
  }

  // Default to platform admin (first mod user) for partners without explicit seller
  // This matches the original biztada.com flow where transactions default to admin
  const defaultAdmin = await getDefaultPlatformAdmin(prisma);
  return defaultAdmin?.user_id || null;
}

/**
 * Get the default platform admin user (first moderator or system admin).
 * Used as seller/reviewer fallback when no explicit seller is specified.
 */
export async function getDefaultPlatformAdmin(
  prisma: PrismaClient,
): Promise<{ user_id: string } | null> {
  try {
    const admin = await prisma.users.findFirst({
      where: {
        role: { in: ['mod'] }, // Moderators have admin privileges
        status: 'active',
      },
      select: { user_id: true },
    });
    return admin || null;
  } catch (error) {
    console.warn('[resolvePartnerSeller] Failed to fetch default admin:', error);
    return null;
  }
}
