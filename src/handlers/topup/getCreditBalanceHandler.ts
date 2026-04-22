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
    new Set([caller.userId, ...aliasUsers.map((u: { user_id: string }) => u.user_id)]),
  );

  let [balanceRows, ledgerEntries, latestLedgerEntry] = await Promise.all([
    prisma.userCreditBalances.findMany({
      where: { user_id: { in: userIds } },
      select: {
        user_id: true,
        available_credits: true,
        updated_at: true,
      },
    }),
    prisma.creditLedgerEntries.findMany({
      where: {
        user_id: { in: userIds },
      },
      select: {
        direction: true,
        amount: true,
      },
    }),
    prisma.creditLedgerEntries.findFirst({
      where: {
        user_id: { in: userIds },
      },
      select: {
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  if (ledgerEntries.length === 0) {
    const tableCredits = balanceRows.reduce(
      (sum: number, row: { available_credits: { toString?: () => string } }) =>
        sum + Number(row.available_credits?.toString?.() ?? 0),
      0,
    );

    if (tableCredits > 0) {
      await prisma.$transaction(async (tx: any) => {
        await tx.creditLedgerEntries.create({
          data: {
            user_id: caller.userId,
            entry_type: 'ADJUSTMENT',
            direction: 'CREDIT',
            amount: tableCredits,
            balance_after: tableCredits,
            purpose: 'Bootstrap ledger from grouped user credit balance snapshot',
            source_channel: 'DIRECT',
            metadata: {
              table_credits_snapshot: tableCredits,
              grouped_user_ids: userIds,
            },
            created_by: caller.userId,
          },
        });
      });

      [balanceRows, ledgerEntries, latestLedgerEntry] = await Promise.all([
        prisma.userCreditBalances.findMany({
          where: { user_id: { in: userIds } },
          select: {
            user_id: true,
            available_credits: true,
            updated_at: true,
          },
        }),
        prisma.creditLedgerEntries.findMany({
          where: {
            user_id: { in: userIds },
          },
          select: {
            direction: true,
            amount: true,
          },
        }),
        prisma.creditLedgerEntries.findFirst({
          where: {
            user_id: { in: userIds },
          },
          select: {
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        }),
      ]);
    }
  }

  const ledgerCredits = ledgerEntries.reduce(
    (sum: number, item: { direction: 'CREDIT' | 'DEBIT'; amount: { toString?: () => string } }) => {
      const amount = Number(item.amount?.toString?.() ?? 0);
      return item.direction === 'DEBIT' ? sum - amount : sum + amount;
    },
    0,
  );

  return reply.send({
    success: true,
    data: {
      user_id: caller.userId,
      available_credits: Math.max(0, ledgerCredits).toFixed(2),
      updated_at:
        latestLedgerEntry?.created_at?.toISOString?.() ??
        balanceRows
          .map((row: { updated_at: Date | null }) => row.updated_at)
          .filter(Boolean)
          .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]
          ?.toISOString?.() ??
        null,
    },
  });
}
