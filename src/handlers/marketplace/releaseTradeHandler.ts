import { FastifyReply, FastifyRequest } from 'fastify';

interface ReleaseTradeBody {
  tradeId: string;
}

export async function handler(
  request: FastifyRequest<{ Body: ReleaseTradeBody }>,
  reply: FastifyReply,
) {
  const { tradeId } = request.body;

  const authUserId = (request.user as { userId?: string } | undefined)?.userId;
  if (!authUserId) {
    return reply.status(401).send({ success: false, message: 'Unauthorized' });
  }

  try {
    await request.prisma.$transaction(async (tx) => {
      const trade = await tx.marketplaceTrades.findUnique({
        where: { trade_id: tradeId },
      });

      if (!trade) {
        throw new Error('Giao dịch không tồn tại.');
      }
      if (trade.status !== 'escrow') {
        throw new Error('Giao dịch không ở trạng thái tạm giữ.');
      }
      // Only buyer or admin can release the trade
      if (trade.buyer_id !== authUserId) {
        // Here we could also check if authUser is admin, but for now we only allow buyer
        throw new Error('Chỉ người mua mới có quyền giải phóng tiền.');
      }

      // Update trade status
      await tx.marketplaceTrades.update({
        where: { trade_id: tradeId },
        data: { status: 'completed' },
      });

      // We need to move escrow_credits to available_credits for the BUYER? No.
      // The buyer already paid, their available_credits was deducted and escrow_credits increased.
      // So now we deduct buyer's escrow_credits, and increment seller's available_credits.

      const credits = Number(trade.credits);
      const fee = Number(trade.fee_credits || 0);
      const netToSeller = credits - fee;

      // 1. Deduct buyer's escrow
      await tx.userCreditBalances.update({
        where: { user_id: trade.buyer_id },
        data: { escrow_credits: { decrement: credits } },
      });

      // 2. Increment seller's available
      const sellerBalance = await tx.userCreditBalances.upsert({
        where: { user_id: trade.seller_id },
        update: { available_credits: { increment: netToSeller } },
        create: { user_id: trade.seller_id, available_credits: netToSeller, escrow_credits: 0 },
      });

      // 3. Create Ledger Entry for seller
      await tx.creditLedgerEntries.create({
        data: {
          user_id: trade.seller_id,
          entry_type: 'MARKETPLACE_RELEASE',
          direction: 'CREDIT',
          amount: netToSeller,
          balance_after: Number(sellerBalance.available_credits), // This is after update
          purpose: `Nhận tiền bán sản phẩm (Order: ${trade.order_ref})`,
          metadata: { trade_id: tradeId, listing_id: trade.listing_id },
        },
      });

      // If there's a fee, we could log it to a system account here
    });

    return reply.send({
      success: true,
      message: 'Đã giải phóng tiền cho người bán thành công.',
    });
  } catch (error: any) {
    return reply.status(400).send({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi thực hiện thao tác.',
    });
  }
}
