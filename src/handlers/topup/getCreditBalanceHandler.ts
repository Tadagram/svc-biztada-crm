import { FastifyRequest, FastifyReply } from 'fastify';

const VND_TO_CREDIT_RATE = 2_600;
const USDT_TO_CREDIT_RATE = 10;

function normalizeTopupToCredits(
  amount: number,
  currency?: string | null,
  creditAmount?: number,
): number {
  const cur = (currency ?? '').toUpperCase();
  if (cur === 'VND') return Math.floor(amount / VND_TO_CREDIT_RATE);
  if (cur === 'USDT' || cur === 'USD') return Math.round(amount * USDT_TO_CREDIT_RATE * 100) / 100;
  return Number.isFinite(creditAmount) ? (creditAmount as number) : 0;
}

function normalizePhone(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('tg_')) return trimmed;
  return trimmed.replace(/\D/g, '');
}

function buildPhoneVariants(input?: string | null): string[] {
  const raw = (input ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('tg_')) return [raw];

  const digits = normalizePhone(raw);
  if (!digits) return [raw];

  const variants = new Set<string>([raw, digits, `+${digits}`]);

  if (digits.startsWith('84')) {
    const local = `0${digits.slice(2)}`;
    variants.add(local);
    variants.add(`+${local}`);
  }

  if (digits.startsWith('0')) {
    const intl = `84${digits.slice(1)}`;
    variants.add(intl);
    variants.add(`+${intl}`);
  }

  return Array.from(variants).filter(Boolean);
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const prisma = request.prisma as any;
  const caller = request.user;

  const callerUser = await prisma.users.findUnique({
    where: { user_id: caller.userId },
    select: { user_id: true, phone_number: true },
  });

  const aliasUsers = callerUser?.phone_number
    ? await prisma.users.findMany({
        where: {
          phone_number: {
            in: buildPhoneVariants(callerUser.phone_number),
          },
        },
        select: { user_id: true },
      })
    : [];

  const userIds = Array.from(
    new Set([caller.userId, ...aliasUsers.map((user: { user_id: string }) => user.user_id)]),
  );

  const balances = await prisma.userCreditBalances.findMany({
    where: { user_id: { in: userIds } },
    select: { user_id: true, available_credits: true, updated_at: true },
  });

  const totalCredits = balances.reduce(
    (sum: number, item: { available_credits: { toString?: () => string } }) =>
      sum + Number(item.available_credits?.toString?.() ?? 0),
    0,
  );

  const latestUpdatedAt = balances
    .map((item: { updated_at: Date | null }) => item.updated_at)
    .filter(Boolean)
    .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

  const [approvedTopups, completedPurchases, renewAdjustLedgerEntries] = await Promise.all([
    prisma.topUpRequests.findMany({
      where: {
        user_id: { in: userIds },
        status: 'APPROVED',
      },
      select: {
        amount: true,
        currency: true,
        credit_amount: true,
      },
    }),
    prisma.servicePackagePurchases.findMany({
      where: {
        user_id: { in: userIds },
        status: 'completed',
      },
      select: {
        total_price_usd: true,
      },
    }),
    prisma.creditLedgerEntries.findMany({
      where: {
        user_id: { in: userIds },
        OR: [
          { entry_type: 'ADJUSTMENT' },
          { purpose: { startsWith: 'Renew license key' } },
          { purpose: { startsWith: 'Refund renew license key' } },
        ],
      },
      select: {
        direction: true,
        amount: true,
      },
    }),
  ]);

  const normalizedTopupCredits = approvedTopups.reduce(
    (
      sum: number,
      item: {
        amount: { toString?: () => string };
        currency: string | null;
        credit_amount: { toString?: () => string };
      },
    ) => {
      const amount = Number(item.amount?.toString?.() ?? 0);
      const creditAmount = Number(item.credit_amount?.toString?.() ?? 0);
      return sum + normalizeTopupToCredits(amount, item.currency, creditAmount);
    },
    0,
  );

  const purchaseDebits = completedPurchases.reduce(
    (sum: number, item: { total_price_usd: { toString?: () => string } }) => {
      const totalPriceUsd = Number(item.total_price_usd?.toString?.() ?? 0);
      return sum + Math.round(totalPriceUsd * USDT_TO_CREDIT_RATE * 100) / 100;
    },
    0,
  );

  const renewAdjustDelta = renewAdjustLedgerEntries.reduce(
    (sum: number, item: { direction: 'CREDIT' | 'DEBIT'; amount: { toString?: () => string } }) => {
      const amount = Number(item.amount?.toString?.() ?? 0);
      return item.direction === 'DEBIT' ? sum - amount : sum + amount;
    },
    0,
  );

  const normalizedComputedCredits = normalizedTopupCredits - purchaseDebits + renewAdjustDelta;
  const resolvedCredits = normalizedComputedCredits;

  if (Math.abs(totalCredits - resolvedCredits) > 0.009) {
    request.log.warn(
      {
        callerUserId: caller.userId,
        aliasUserIds: userIds,
        tableBalance: totalCredits,
        resolvedCredits,
        normalizedTopupCredits,
        purchaseDebits,
        renewAdjustDelta,
      },
      'Credit balance differs from normalized transaction-derived balance; returning normalized balance',
    );
  }

  const matchedPrimary = balances.find(
    (item: { user_id: string }) => item.user_id === caller.userId,
  );
  const effectiveUserId = matchedPrimary?.user_id ?? balances[0]?.user_id ?? caller.userId;

  return reply.send({
    success: true,
    data: {
      user_id: effectiveUserId,
      available_credits: Math.max(0, resolvedCredits).toFixed(2),
      updated_at: latestUpdatedAt?.toISOString?.() ?? null,
    },
  });
}
