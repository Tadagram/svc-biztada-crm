import { PrismaClient } from '@prisma/client';
import type { PartnerContext } from './partnerContext';

const DEFAULT_SOLOAI_TEST_SELLER_PHONE = '84523153194';

function buildPhoneVariants(phone: string): string[] {
  const raw = phone.trim();
  if (!raw) return [];

  const set = new Set<string>();
  set.add(raw);

  if (!raw.startsWith('+')) {
    set.add(`+${raw}`);
  }

  if (raw.startsWith('84')) {
    set.add(`0${raw.slice(2)}`);
    set.add(`+${raw}`);
  }

  if (raw.startsWith('+84')) {
    set.add(raw.slice(1));
    set.add(`0${raw.slice(3)}`);
  }

  if (raw.startsWith('0') && raw.length > 1) {
    set.add(`84${raw.slice(1)}`);
    set.add(`+84${raw.slice(1)}`);
  }

  return Array.from(set);
}

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

  if (partnerContext.partnerId !== 'soloai') {
    return null;
  }

  const sellerPhone =
    process.env.SOLOAI_SELLER_PHONE?.trim() ||
    process.env.SOLOAI_SELLER_TEST_PHONE?.trim() ||
    DEFAULT_SOLOAI_TEST_SELLER_PHONE;

  const variants = buildPhoneVariants(sellerPhone);
  if (variants.length === 0) return null;

  const seller = await prisma.users.findFirst({
    where: {
      phone_number: {
        in: variants,
      },
    },
    select: {
      user_id: true,
    },
  });

  return seller?.user_id ?? null;
}
