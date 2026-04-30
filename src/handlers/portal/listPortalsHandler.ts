import { FastifyRequest, FastifyReply } from 'fastify';
import {
  adminListPortalDevices,
  type CoreAdminPortalListParams,
} from '@services/corePortalDevices';

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

  const params: CoreAdminPortalListParams = {
    page,
    limit,
    ...(user_id && { user_id }),
    ...(telegram_id && { telegram_id }),
    ...(status && { status }),
    ...(portal_type && { portal_type }),
    ...(search && { search }),
  };

  try {
    const result = await adminListPortalDevices(params);

    return reply.send({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
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
