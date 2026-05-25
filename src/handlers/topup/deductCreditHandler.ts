import { FastifyRequest, FastifyReply } from 'fastify';

interface DeductCreditBody {
  amount: number;
  purpose: string;
  task_id?: string | null;
  service?: string | null; // e.g. 'image_generate', 'clip_generate'
}

export const handler = async (
  request: FastifyRequest<{ Body: DeductCreditBody }>,
  reply: FastifyReply,
) => {
  const prisma = (request.server as any).prisma;
  const userId: string | undefined = (request as any).user?.user_id;

  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const { amount, purpose, task_id, service } = request.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return reply.status(400).send({ error: 'amount must be a positive number' });
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const balance = await tx.userCreditBalances.findUnique({
        where: { user_id: userId },
        select: { available_credits: true },
      });

      const tableAvailable = Number(
        (balance?.available_credits as any)?.toString?.() ?? balance?.available_credits ?? 0,
      );

      const ledgerEntries = await tx.creditLedgerEntries.findMany({
        where: { user_id: userId },
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
        where: { user_id: userId },
        create: { user_id: userId, available_credits: finalBalance },
        update: { available_credits: finalBalance },
      });

      const balanceAfter = finalBalance;

      await tx.creditLedgerEntries.create({
        data: {
          user_id: userId,
          topup_id: null,
          entry_type: 'USAGE',
          direction: 'DEBIT',
          amount,
          balance_after: balanceAfter,
          purpose: purpose || 'AI generation',
          source_channel: 'DIRECT',
          sales_agency_uuid: null,
          created_by: userId,
          metadata: {
            task_id: task_id ?? null,
            service: service ?? null,
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
    request.log.error(err, '[deductCredit] transaction failed');
    return reply.status(500).send({ error: 'Internal server error' });
  }
};
