import { FastifyReply, FastifyRequest } from 'fastify';

interface DisputeTradeBody {
  tradeId: string;
  reason: string;
}

export async function handler(
  request: FastifyRequest<{ Body: DisputeTradeBody }>,
  reply: FastifyReply,
) {
  const { tradeId, reason } = request.body;

  const authUserId = (request.user as { userId?: string } | undefined)?.userId;
  if (!authUserId) {
    return reply.status(401).send({ success: false, message: 'Unauthorized' });
  }

  if (!reason?.trim()) {
    return reply
      .status(400)
      .send({ success: false, message: 'Vui lòng cung cấp lý do tranh chấp.' });
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
      if (trade.buyer_id !== authUserId && trade.seller_id !== authUserId) {
        throw new Error('Chỉ người mua hoặc người bán mới có quyền báo cáo tranh chấp.');
      }

      await tx.marketplaceTrades.update({
        where: { trade_id: tradeId },
        data: { status: 'disputed' },
      });

      // We don't move any money here. Money stays in buyer's escrow_credits.
      // Admin will resolve it later.

      // Could emit an event or create a ticket for admin here.
    });

    return reply.send({
      success: true,
      message: 'Đã báo cáo tranh chấp thành công. Admin sẽ kiểm tra và giải quyết.',
    });
  } catch (error: any) {
    return reply.status(400).send({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi thực hiện thao tác.',
    });
  }
}
