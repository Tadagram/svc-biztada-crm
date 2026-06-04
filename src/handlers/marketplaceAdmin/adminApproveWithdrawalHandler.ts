import { FastifyReply, FastifyRequest } from 'fastify';

interface AdminApproveWithdrawalBody {
  withdrawalId: string;
  status: 'approved' | 'rejected';
}

export async function handler(
  request: FastifyRequest<{ Body: AdminApproveWithdrawalBody }>,
  reply: FastifyReply,
) {
  const { withdrawalId, status } = request.body;

  if (!['approved', 'rejected'].includes(status)) {
    return reply.status(400).send({ success: false, message: 'Trạng thái không hợp lệ.' });
  }

  try {
    await request.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.marketplaceWithdrawals.findUnique({
        where: { withdrawal_id: withdrawalId },
      });

      if (!withdrawal) {
        throw new Error('Yêu cầu rút tiền không tồn tại.');
      }
      if (withdrawal.status !== 'pending') {
        throw new Error('Yêu cầu không ở trạng thái chờ duyệt.');
      }

      await tx.marketplaceWithdrawals.update({
        where: { withdrawal_id: withdrawalId },
        data: { status },
      });

      if (status === 'approved') {
        const credits = Number(withdrawal.amount);

        const sellerBalance = await tx.userCreditBalances.update({
          where: { user_id: withdrawal.user_id },
          data: { available_credits: { decrement: credits } },
        });

        await tx.creditLedgerEntries.create({
          data: {
            user_id: withdrawal.user_id,
            entry_type: 'MARKETPLACE_WITHDRAWAL',
            direction: 'DEBIT',
            amount: credits,
            balance_after: Number(sellerBalance.available_credits),
            purpose: `Rút doanh thu bán hàng ra tài khoản ${withdrawal.destination}`,
            metadata: { withdrawal_id: withdrawalId },
          },
        });
      }
    });

    return reply.send({
      success: true,
      message: `Đã xử lý yêu cầu rút tiền: ${status}.`,
    });
  } catch (error: any) {
    return reply.status(400).send({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi cập nhật.',
    });
  }
}
