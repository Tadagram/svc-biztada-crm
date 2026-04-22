import { FastifyRequest, FastifyReply } from 'fastify';

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const prisma = request.prisma as any;
  const caller = request.user;

  const [ledgerEntries, latestLedgerEntry] = await Promise.all([
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
      updated_at: latestLedgerEntry?.created_at?.toISOString?.() ?? null,
    },
  });
}
