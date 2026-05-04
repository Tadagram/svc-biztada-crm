type HeaderValue = string | string[] | undefined;

type SourceChannel = 'DIRECT' | 'WHITELABEL';

export interface PartnerContext {
  partnerId: string;
  partnerDomain: string | null;
  sellerUserId: string | null;
  sourceChannel: SourceChannel;
}

const DEFAULT_PARTNER_ID = 'biztada';

function firstHeaderValue(value: HeaderValue): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }
  return value.trim() || null;
}

function parsePartnerSellerMap(raw?: string): Record<string, string> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const output: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) {
        output[key.toLowerCase()] = value.trim();
      }
    }

    return output;
  } catch {
    return {};
  }
}

function resolveSellerFromEnv(partnerId: string, partnerDomain: string | null): string | null {
  const map = parsePartnerSellerMap(process.env.PARTNER_SELLER_MAP);
  const byPartner = map[partnerId.toLowerCase()];
  if (byPartner) return byPartner;

  if (partnerDomain) {
    const byDomain = map[partnerDomain.toLowerCase()];
    if (byDomain) return byDomain;
  }

  if (partnerId === 'soloai') {
    const soloaiFallback = process.env.SOLOAI_SELLER_USER_ID?.trim();
    if (soloaiFallback) return soloaiFallback;
  }

  return null;
}

export function resolvePartnerContext(headers: Record<string, HeaderValue>): PartnerContext {
  const partnerIdHeader = firstHeaderValue(headers['x-partner-id'])?.toLowerCase();
  const partnerDomain = firstHeaderValue(headers['x-partner-domain'])?.toLowerCase() ?? null;

  const partnerId = partnerIdHeader || DEFAULT_PARTNER_ID;
  const sourceChannel: SourceChannel = partnerId === DEFAULT_PARTNER_ID ? 'DIRECT' : 'WHITELABEL';

  const sellerFromHeader = firstHeaderValue(headers['x-seller-user-id']);
  const sellerUserId = sellerFromHeader || resolveSellerFromEnv(partnerId, partnerDomain);

  return {
    partnerId,
    partnerDomain,
    sellerUserId: sellerUserId ?? null,
    sourceChannel,
  };
}
