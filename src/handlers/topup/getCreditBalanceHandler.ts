import { FastifyRequest, FastifyReply } from 'fastify';

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

  const ledgerEntries = await prisma.creditLedgerEntries.findMany({
    where: { user_id: { in: userIds } },
    select: { direction: true, amount: true },
  });

  const ledgerCredits = ledgerEntries.reduce(
    (
      sum: number,
      entry: { direction: 'CREDIT' | 'DEBIT'; amount: { toString?: () => string } },
    ) => {
      const amount = Number(entry.amount?.toString?.() ?? 0);
      return entry.direction === 'DEBIT' ? sum - amount : sum + amount;
    },
    0,
  );

  let resolvedCredits = totalCredits;

  if (ledgerEntries.length > 0) {
    resolvedCredits = ledgerCredits;

    if (Math.abs(totalCredits - ledgerCredits) > 0.009) {
      request.log.warn(
        {
          callerUserId: caller.userId,
          aliasUserIds: userIds,
          tableBalance: totalCredits,
          ledgerBalance: ledgerCredits,
        },
        'Credit balance table differs from ledger; returning ledger balance',
      );
    }
  } else if (resolvedCredits <= 0) {
    const approvedTopups = await prisma.topUpRequests.findMany({
      where: {
        user_id: { in: userIds },
        status: 'APPROVED',
      },
      select: { credit_amount: true },
    });

    resolvedCredits = approvedTopups.reduce(
      (sum: number, item: { credit_amount: { toString?: () => string } }) =>
        sum + Number(item.credit_amount?.toString?.() ?? 0),
      0,
    );

    if (resolvedCredits > 0) {
      request.log.warn(
        {
          callerUserId: caller.userId,
          aliasUserIds: userIds,
          tableBalance: totalCredits,
          fallbackResolvedCredits: resolvedCredits,
        },
        'Credit balance table is stale; returning approved-topup computed credits',
      );
    }
  }

  const matchedPrimary = balances.find(
    (item: { user_id: string }) => item.user_id === caller.userId,
  );
  const effectiveUserId = matchedPrimary?.user_id ?? balances[0]?.user_id ?? caller.userId;

  return reply.send({
    success: true,
    data: {
      user_id: effectiveUserId,
      available_credits: resolvedCredits.toFixed(2),
      updated_at: latestUpdatedAt?.toISOString?.() ?? null,
    },
  });
}
