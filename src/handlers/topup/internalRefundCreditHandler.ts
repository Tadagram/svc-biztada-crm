import { FastifyRequest, FastifyReply } from 'fastify';

interface InternalRefundCreditBody {
  user_id: string;
  amount: number;
  purpose: string;
  task_id?: string | null;
  service?: string | null;
  created_by?: string | null;
}

export const handler = async (
  request: FastifyRequest<{ Body: InternalRefundCreditBody }>,
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
      const updated = await tx.userCreditBalances.update({
        where: { user_id },
        data: { available_credits: { increment: amount } },
        select: { available_credits: true },
      });

      const balanceAfter = Number((updated.available_credits as any)?.toString?.() ?? 0);

      await tx.creditLedgerEntries.create({
        data: {
          user_id,
          topup_id: null,
          entry_type: 'REFUND',
          direction: 'CREDIT',
          amount,
          balance_after: balanceAfter,
          purpose: purpose || 'AI task refund',
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

      return { balance_after: balanceAfter };
    });

    return reply.status(200).send({
      success: true,
      amount_refunded: amount,
      balance_after: (result as any).balance_after,
    });
  } catch (err: unknown) {
    request.log.error(err, '[internalRefundCredit] transaction failed');
    return reply.status(500).send({ error: 'Internal server error' });
  }
};
