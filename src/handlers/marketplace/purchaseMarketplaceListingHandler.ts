import { FastifyReply, FastifyRequest } from 'fastify';

interface PurchaseListingBody {
  listingId: string;
}

export async function handler(
  request: FastifyRequest<{ Body: PurchaseListingBody }>,
  reply: FastifyReply,
) {
  const { listingId } = request.body;

  const authUserId = (request.user as { userId?: string } | undefined)?.userId;
  if (!authUserId) {
    return reply.status(401).send({ success: false, message: 'Unauthorized' });
  }

  if (!listingId) {
    return reply.status(400).send({ success: false, message: 'listingId là bắt buộc.' });
  }

  try {
    const result = await request.prisma.$transaction(async (tx) => {
      // 1. Lock and check listing
      const listing = await tx.marketplaceListings.findUnique({
        where: { listing_id: listingId },
      });

      if (!listing) {
        throw new Error('Sản phẩm không tồn tại.');
      }
      if (listing.status !== 'active') {
        throw new Error('Sản phẩm không ở trạng thái mở bán.');
      }
      if (listing.seller_id === authUserId) {
        throw new Error('Bạn không thể mua sản phẩm của chính mình.');
      }

      // 2. Lock and check buyer credits
      const balance = await tx.userCreditBalances.findUnique({
        where: { user_id: authUserId },
      });

      if (!balance || Number(balance.available_credits) < Number(listing.credits)) {
        throw new Error('Không đủ số dư tín dụng.');
      }

      // 3. Update balances
      const credits = Number(listing.credits);
      await tx.userCreditBalances.update({
        where: { user_id: authUserId },
        data: {
          available_credits: { decrement: credits },
          escrow_credits: { increment: credits },
        },
      });

      // 4. Create Ledger Entry
      await tx.creditLedgerEntries.create({
        data: {
          user_id: authUserId,
          entry_type: 'MARKETPLACE_HOLD',
          direction: 'DEBIT',
          amount: credits,
          balance_after: Number(balance.available_credits) - credits,
          purpose: `Tạm giữ tiền mua sản phẩm ${listing.title}`,
          metadata: { listing_id: listingId },
        },
      });

      // 5. Create Trade
      const trade = await tx.marketplaceTrades.create({
        data: {
          listing_id: listing.listing_id,
          buyer_id: authUserId,
          seller_id: listing.seller_id,
          credits: listing.credits,
          fee_credits: 0,
          status: 'escrow',
          order_ref: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      });

      return trade;
    });

    return reply.send({
      success: true,
      message: 'Giao dịch thành công, tiền đã được chuyển vào trạng thái tạm giữ (Escrow).',
      data: { tradeId: result.trade_id },
    });
  } catch (error: any) {
    return reply.status(400).send({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi thực hiện giao dịch.',
    });
  }
}
