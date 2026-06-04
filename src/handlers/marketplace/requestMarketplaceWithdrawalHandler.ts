import { FastifyReply, FastifyRequest } from 'fastify';
import { getBusinessIdFromRequest, fetchMarketplaceState } from './stateStore';

interface RequestWithdrawalBody {
  businessId?: string;
  actionKey: string;
  draft: {
    amount: string;
    destination: string;
  };
}

export async function handler(
  request: FastifyRequest<{ Body: RequestWithdrawalBody }>,
  reply: FastifyReply,
) {
  const { draft } = request.body;

  const authUserId = (request.user as { userId?: string } | undefined)?.userId;
  if (!authUserId) {
    return reply.status(401).send({ success: false, message: 'Unauthorized' });
  }

  const amount = Number(draft.amount);

  if (!Number.isFinite(amount)) {
    return reply.status(400).send({ success: false, message: 'Số credits rút không hợp lệ.' });
  }
  if (amount < 50) {
    return reply.status(400).send({ success: false, message: 'Mức rút tối thiểu là 50 credits.' });
  }
  if (!draft.destination?.trim()) {
    return reply.status(400).send({ success: false, message: 'Tài khoản nhận tiền là bắt buộc.' });
  }

  // Calculate withdrawable amount
  const completedSales = await request.prisma.marketplaceTrades.findMany({
    where: {
      seller_id: authUserId,
      status: 'completed',
    },
  });

  const pendingWithdrawals = await request.prisma.marketplaceWithdrawals.findMany({
    where: {
      user_id: authUserId,
      status: 'pending',
    },
  });

  const withdrawable = completedSales.reduce(
    (sum, trade) => sum + Number(trade.credits) - Number(trade.fee_credits || 0),
    0,
  );
  const pending = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  const available = Math.max(withdrawable - pending, 0);

  if (amount > available) {
    return reply
      .status(400)
      .send({ success: false, message: 'Số credits rút vượt quá phần có thể rút.' });
  }

  const createdWithdrawal = await request.prisma.marketplaceWithdrawals.create({
    data: {
      user_id: authUserId,
      amount: amount,
      status: 'pending',
      destination: draft.destination.trim(),
      request_ref: `WDR-${Date.now()}`,
    },
  });

  const businessId = getBusinessIdFromRequest(request, request.body.businessId);
  const nextSnapshot = await fetchMarketplaceState(request, businessId, authUserId);

  return reply.send({
    success: true,
    message: 'Đã tạo yêu cầu rút tiền, chờ kiểm duyệt để đảm bảo an toàn giao dịch 2 bên.',
    data: {
      withdrawal: {
        id: createdWithdrawal.withdrawal_id,
        amount: Number(createdWithdrawal.amount),
        status: createdWithdrawal.status,
        destination: createdWithdrawal.destination,
        createdAt: createdWithdrawal.created_at.toISOString(),
        requestRef: createdWithdrawal.request_ref,
      },
      state: nextSnapshot,
    },
  });
}
