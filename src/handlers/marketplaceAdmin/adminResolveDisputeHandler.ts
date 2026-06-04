import { FastifyReply, FastifyRequest } from 'fastify';

interface AdminResolveDisputeBody {
  tradeId: string;
  resolution: 'refund' | 'release';
}

export async function handler(
  request: FastifyRequest<{ Body: AdminResolveDisputeBody }>,
  reply: FastifyReply,
) {
  const { tradeId, resolution } = request.body;

  if (!['refund', 'release'].includes(resolution)) {
    return reply.status(400).send({ success: false, message: 'Quyết định không hợp lệ.' });
  }

  try {
    await request.prisma.$transaction(async (tx) => {
      const trade = await tx.marketplaceTrades.findUnique({
        where: { trade_id: tradeId },
      });

      if (!trade) {
        throw new Error('Giao dịch không tồn tại.');
      }
      if (trade.status !== 'disputed' && trade.status !== 'escrow') {
        throw new Error('Giao dịch không ở trạng thái tranh chấp hoặc tạm giữ.');
      }

      const credits = Number(trade.credits);

      if (resolution === 'refund') {
        // Hoàn tiền cho buyer
        await tx.marketplaceTrades.update({
          where: { trade_id: tradeId },
          data: { status: 'refunded' },
        });

        // Deduct escrow, increment available for buyer
        const buyerBalance = await tx.userCreditBalances.update({
          where: { user_id: trade.buyer_id },
          data: {
            escrow_credits: { decrement: credits },
            available_credits: { increment: credits },
          },
        });

        await tx.creditLedgerEntries.create({
          data: {
            user_id: trade.buyer_id,
            entry_type: 'MARKETPLACE_REFUND',
            direction: 'CREDIT',
            amount: credits,
            balance_after: Number(buyerBalance.available_credits),
            purpose: `Hoàn tiền tranh chấp giao dịch ${trade.order_ref}`,
            metadata: { trade_id: tradeId },
          },
        });
      } else if (resolution === 'release') {
        // Trả tiền cho seller
        await tx.marketplaceTrades.update({
          where: { trade_id: tradeId },
          data: { status: 'completed' },
        });

        const netToSeller = credits - Number(trade.fee_credits || 0);

        await tx.userCreditBalances.update({
          where: { user_id: trade.buyer_id },
          data: { escrow_credits: { decrement: credits } },
        });

        const sellerBalance = await tx.userCreditBalances.upsert({
          where: { user_id: trade.seller_id },
          update: { available_credits: { increment: netToSeller } },
          create: { user_id: trade.seller_id, available_credits: netToSeller, escrow_credits: 0 },
        });

        await tx.creditLedgerEntries.create({
          data: {
            user_id: trade.seller_id,
            entry_type: 'MARKETPLACE_RELEASE',
            direction: 'CREDIT',
            amount: netToSeller,
            balance_after: Number(sellerBalance.available_credits),
            purpose: `Giải phóng tiền tranh chấp giao dịch ${trade.order_ref}`,
            metadata: { trade_id: tradeId },
          },
        });
      }
    });

    return reply.send({
      success: true,
      message: `Đã xử lý tranh chấp với quyết định: ${resolution}.`,
    });
  } catch (error: any) {
    return reply.status(400).send({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi cập nhật.',
    });
  }
}
