import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import {
  adminListPortalDevices,
  type CoreAdminPortalListParams,
} from '@services/corePortalDevices';
import { USER_ROLES } from '@/utils/constants';

function resolveOwnerName(user: any): string {
  const customFields =
    user?.custom_fields && typeof user.custom_fields === 'object' ? user.custom_fields : null;

  const customName =
    (typeof customFields?.display_name === 'string' && customFields.display_name.trim()) ||
    (typeof customFields?.full_name === 'string' && customFields.full_name.trim()) ||
    (typeof customFields?.name === 'string' && customFields.name.trim()) ||
    null;

  return customName || user?.agency_name || user?.phone_number || user?.user_id;
}

interface ListPortalsQuerystring {
  page?: number;
  limit?: number;
  user_id?: string;
  telegram_id?: number;
  status?: string;
  portal_type?: string;
  search?: string;
  owner_name?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: ListPortalsQuerystring }>,
  reply: FastifyReply,
) {
  const {
    page = 1,
    limit = 20,
    user_id,
    telegram_id,
    status,
    portal_type,
    search,
    owner_name,
  } = request.query;
  const caller = request.user as { userId: string; role: UserRole | null };

  // --- Agency isolation: only show portals belonging to the agency's sub-users ---
  let agencySubUserIds: Set<string> | null = null;
  const prisma = request.prisma as any;

  if (caller.role === USER_ROLES.AGENCY) {
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
    limit: agencySubUserIds || owner_name ? 500 : limit, // fetch wider for post-filter when agency or owner_name filter
    ...(user_id && { user_id }),
    ...(telegram_id && { telegram_id }),
    ...(status && { status }),
    ...(portal_type && { portal_type }),
    ...(search && { search }),
  };

  try {
    const result = await adminListPortalDevices(params);

    // Enrich portals with owner_name from CRM users table using existing columns only.
    const userIds = [...new Set(result.data.map((p: any) => p.user_id))];
    const users = userIds.length
      ? await prisma.users.findMany({
          where: { user_id: { in: userIds } },
          select: {
            user_id: true,
            agency_name: true,
            phone_number: true,
            custom_fields: true,
          },
        })
      : [];
    const userMap = new Map(users.map((u: any) => [u.user_id, resolveOwnerName(u)]));

    const enrichedData = result.data.map((p: any) => ({
      ...p,
      owner_name: userMap.get(p.user_id) || p.user_id,
    }));

    // Post-filter and paginate portals
    let finalData = enrichedData;
    let finalTotal = result.total;
    let finalPage = result.page;

    if (agencySubUserIds) {
      finalData = finalData.filter((p: any) => agencySubUserIds!.has(p.user_id));
      finalTotal = finalData.length;
      finalPage = page;
    }

    // Filter by owner_name if provided
    if (owner_name) {
      const lowerOwnerName = owner_name.toLowerCase();
      finalData = finalData.filter((p: any) => p.owner_name.toLowerCase().includes(lowerOwnerName));
      finalTotal = finalData.length;
      finalPage = page;
    }

    // Apply pagination after all filtering
    const skip = (page - 1) * limit;
    finalData = finalData.slice(skip, skip + limit);

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
