import { FastifyReply, FastifyRequest } from 'fastify';

interface AdminApproveListingBody {
  listingId: string;
  status: 'active' | 'rejected' | 'suspended';
}

export async function handler(
  request: FastifyRequest<{ Body: AdminApproveListingBody }>,
  reply: FastifyReply,
) {
  const { listingId, status } = request.body;

  const validStatuses = ['active', 'rejected', 'suspended'];
  if (!validStatuses.includes(status)) {
    return reply.status(400).send({ success: false, message: 'Trạng thái không hợp lệ.' });
  }

  try {
    const updated = await request.prisma.marketplaceListings.update({
      where: { listing_id: listingId },
      data: { status },
    });

    return reply.send({
      success: true,
      message: `Đã cập nhật trạng thái sản phẩm thành ${status}.`,
      data: updated,
    });
  } catch (error: any) {
    return reply.status(400).send({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi cập nhật.',
    });
  }
}
