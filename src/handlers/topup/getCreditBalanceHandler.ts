import { FastifyRequest, FastifyReply } from 'fastify';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const prisma = request.prisma as any;
  const caller = request.user;

  let [balanceRow, ledgerEntries, latestLedgerEntry] = await Promise.all([
    prisma.userCreditBalances.findUnique({
      where: { user_id: caller.userId },
      select: {
        available_credits: true,
        updated_at: true,
      },
    }),
    prisma.creditLedgerEntries.findMany({
      where: {
        user_id: caller.userId,
      },
      select: {
        direction: true,
        amount: true,
      },
    }),
    prisma.creditLedgerEntries.findFirst({
      where: {
        user_id: caller.userId,
      },
      select: {
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  if (ledgerEntries.length === 0) {
    const tableCredits = Number(balanceRow?.available_credits?.toString?.() ?? 0);

    if (tableCredits > 0) {
      await prisma.$transaction(async (tx: any) => {
        await tx.creditLedgerEntries.create({
          data: {
            user_id: caller.userId,
            entry_type: 'ADJUSTMENT',
            direction: 'CREDIT',
            amount: tableCredits,
            balance_after: tableCredits,
            purpose: 'Bootstrap ledger from user credit balance snapshot',
            source_channel: 'DIRECT',
            metadata: {
              table_credits_snapshot: tableCredits,
            },
            created_by: caller.userId,
          },
        });
      });

      [balanceRow, ledgerEntries, latestLedgerEntry] = await Promise.all([
        prisma.userCreditBalances.findUnique({
          where: { user_id: caller.userId },
          select: {
            available_credits: true,
            updated_at: true,
          },
        }),
        prisma.creditLedgerEntries.findMany({
          where: {
            user_id: caller.userId,
          },
          select: {
            direction: true,
            amount: true,
          },
        }),
        prisma.creditLedgerEntries.findFirst({
          where: {
            user_id: caller.userId,
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
        balanceRow?.updated_at?.toISOString?.() ??
        null,
    },
  });
}
