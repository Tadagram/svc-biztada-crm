import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import {
  adminListPortalDevices,
  type CoreAdminPortalListParams,
} from '@services/corePortalDevices';
import { USER_ROLES } from '@/utils/constants';

interface ListPortalsQuerystring {
  page?: number;
  limit?: number;
  user_id?: string;
  telegram_id?: number;
  status?: string;
  portal_type?: string;
  search?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListPortalsQuerystring }>,
  reply: FastifyReply,
) {
  const { page = 1, limit = 20, user_id, telegram_id, status, portal_type, search } = request.query;
  const caller = request.user as { userId: string; role: UserRole | null };

  // --- Agency isolation: only show portals belonging to the agency's sub-users ---
  let agencySubUserIds: Set<string> | null = null;
  if (caller.role === USER_ROLES.AGENCY) {
    const prisma = request.prisma as any;
    const subUsers = await prisma.users.findMany({
      where: { parent_user_id: caller.userId },
      select: { user_id: true },
    });
    agencySubUserIds = new Set(subUsers.map((u: any) => u.user_id as string));
    // If caller requests a specific user_id, validate it belongs to their sub-users
    if (user_id && !agencySubUserIds.has(user_id)) {
      return reply.status(403).send({ success: false, message: 'Access denied to this user' });
    }
  }

  const params: CoreAdminPortalListParams = {
    page,
    limit: agencySubUserIds ? 500 : limit, // fetch wider for post-filter when agency
    ...(user_id && { user_id }),
    ...(telegram_id && { telegram_id }),
    ...(status && { status }),
    ...(portal_type && { portal_type }),
    ...(search && { search }),
  };

  try {
    const result = await adminListPortalDevices(params);

    // Post-filter and paginate portals if agency role
    let finalData = result.data;
    let finalTotal = result.total;
    let finalPage = result.page;
    if (agencySubUserIds) {
      const filtered = result.data.filter((p: any) => agencySubUserIds!.has(p.user_id));
      finalTotal = filtered.length;
      finalPage = page;
      const skip = (page - 1) * limit;
      finalData = filtered.slice(skip, skip + limit);
    }

    return reply.send({
      success: true,
      data: finalData,
      total: finalTotal,
      page: finalPage,
      limit,
    });
  } catch (error) {
    request.log.error(error, 'listPortalsHandler: failed to fetch portal list from core-api');
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch portal list',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
