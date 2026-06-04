import { FastifyReply, FastifyRequest } from 'fastify';
import { getBusinessIdFromRequest, fetchMarketplaceState } from './stateStore';

interface CreateMarketplaceListingBody {
  businessId?: string;
  actionKey: string;
  draft: {
    title: string;
    type: 'seeding' | 'ai';
    credits: string;
    banner: string;
    description: string;
  };
}

function validateDraft(body: CreateMarketplaceListingBody['draft']): string | null {
  const credits = Number(body.credits);
  if (!body.title?.trim()) return 'Tên sản phẩm là bắt buộc.';
  if (!body.banner?.trim()) return 'Banner sản phẩm là bắt buộc.';
  if (!body.description?.trim()) return 'Mô tả sản phẩm là bắt buộc.';
  if (!Number.isFinite(credits)) return 'Giá credits không hợp lệ.';
  if (credits < 10) return 'Giá tối thiểu là 10 credits.';
  if (credits > 200000) return 'Giá tối đa là 200000 credits.';
  if (body.title.trim().length > 120) return 'Tên sản phẩm vượt quá 120 ký tự.';
  if (body.banner.trim().length > 120) return 'Banner vượt quá 120 ký tự.';
  if (body.description.trim().length > 300) return 'Mô tả vượt quá 300 ký tự.';
  return null;
}

export async function handler(
  request: FastifyRequest<{ Body: CreateMarketplaceListingBody }>,
  reply: FastifyReply,
) {
  const { draft } = request.body;

  const authUserId = (request.user as { userId?: string } | undefined)?.userId;
  if (!authUserId) {
    return reply.status(401).send({ success: false, message: 'Unauthorized' });
  }

  const validationError = validateDraft(draft);
  if (validationError) {
    return reply.status(400).send({ success: false, message: validationError });
  }

  const businessId = getBusinessIdFromRequest(request, request.body.businessId);

  const createdListing = await request.prisma.marketplaceListings.create({
    data: {
      business_id: businessId,
      seller_id: authUserId,
      title: draft.title.trim(),
      type: draft.type,
      credits: Number(draft.credits),
      banner: draft.banner.trim(),
      description: draft.description.trim(),
      status: 'pending',
    },
  });

  const nextSnapshot = await fetchMarketplaceState(request, businessId, authUserId);

  return reply.send({
    success: true,
    message: 'Đã tạo sản phẩm ở trạng thái chờ duyệt minh bạch (pending).',
    data: {
      listing: {
        id: createdListing.listing_id,
        title: createdListing.title,
        type: createdListing.type,
        seller: createdListing.seller_id,
        credits: Number(createdListing.credits),
        banner: createdListing.banner,
        description: createdListing.description,
        status: createdListing.status,
        createdAt: createdListing.created_at.toISOString(),
        updatedAt: createdListing.updated_at.toISOString(),
      },
      state: nextSnapshot,
    },
  });
}
