import { FastifyRequest, FastifyReply } from 'fastify';

interface InternalDeductCreditBody {
  user_id: string;
  amount: number;
  purpose: string;
  task_id?: string | null;
  service?: string | null;
  created_by?: string | null;
}

export const handler = async (
  request: FastifyRequest<{ Body: InternalDeductCreditBody }>,
  reply: FastifyReply,
) => {
  const prisma = (request.server as any).prisma;
  const { user_id, amount, purpose, task_id, service, created_by } = request.body;

  if (!user_id) {
    return reply.status(400).send({ error: 'user_id is required' });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return reply.status(400).send({ error: 'amount must be a positive number' });
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const balance = await tx.userCreditBalances.findUnique({
        where: { user_id },
        select: { available_credits: true },
      });

      const tableAvailable = Number(
        (balance?.available_credits as any)?.toString?.() ?? balance?.available_credits ?? 0,
      );

      const ledgerEntries = await tx.creditLedgerEntries.findMany({
        where: { user_id },
        select: { direction: true, amount: true },
      });

      const ledgerAvailable = Math.max(
        0,
        ledgerEntries.reduce(
          (
            sum: number,
            item: { direction: 'CREDIT' | 'DEBIT'; amount: { toString?: () => string } },
          ) => {
            const n = Number(item.amount?.toString?.() ?? 0);
            return item.direction === 'DEBIT' ? sum - n : sum + n;
          },
          0,
        ),
      );

      const available = Math.max(tableAvailable, ledgerAvailable);

      if (available < amount) {
        return { insufficient: true, available };
      }

      const finalBalance = available - amount;

      await tx.userCreditBalances.upsert({
        where: { user_id },
        create: { user_id, available_credits: finalBalance },
        update: { available_credits: finalBalance },
      });

      const balanceAfter = finalBalance;

      await tx.creditLedgerEntries.create({
        data: {
          user_id,
          topup_id: null,
          entry_type: 'USAGE',
          direction: 'DEBIT',
          amount,
          balance_after: balanceAfter,
          purpose: purpose || 'AI generation',
          source_channel: 'DIRECT',
          sales_agency_uuid: null,
          created_by: created_by ?? null,
          metadata: {
            task_id: task_id ?? null,
            service: service ?? null,
            source: 'internal',
          },
        },
      });

      return { insufficient: false, balance_after: balanceAfter };
    });

    if ((result as any).insufficient) {
      return reply.status(402).send({
        error: 'insufficient_credits',
        available: (result as any).available,
        required: amount,
      });
    }

    return reply.status(200).send({
      success: true,
      amount_deducted: amount,
      balance_after: (result as any).balance_after,
    });
  } catch (err: unknown) {
    request.log.error(err, '[internalDeductCredit] transaction failed');
    return reply.status(500).send({ error: 'Internal server error' });
  }
};
