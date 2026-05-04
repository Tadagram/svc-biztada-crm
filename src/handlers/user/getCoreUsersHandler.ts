import type { FastifyRequest, FastifyReply } from 'fastify';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

interface CoreUserItem {
  id: string;
  telegram_id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  telegram_phone?: string | null;
  email?: string | null;
  is_premium: boolean;
  business_count: number;
  portal_count: number;
  worker_count: number;
  created_at: string;
}

interface CoreUserListResponse {
  success: boolean;
  data: {
    users: CoreUserItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

function normalizeUserSearch(raw: string): string {
  const value = raw.trim();
  if (!value) return '';

  const phoneLike = value.replace(/[^\d+]/g, '');
  const digitsOnly = phoneLike.replace(/\D/g, '');

  // Phone search normalization:
  // - keep alphanumeric queries as-is (username/name/email)
  // - for phone-like input, use trailing digits so local (0...) and intl (+84...) formats both match
  if (digitsOnly.length >= 9) {
    return digitsOnly.slice(-9);
  }

  return phoneLike || value;
}

export const handler = async (
  request: FastifyRequest<{
    Querystring: {
      limit?: string;
      offset?: string;
      search?: string;
    };
  }>,
  reply: FastifyReply,
) => {
  const limit = parseInt(request.query.limit ?? '10', 10) || 10;
  const offset = parseInt(request.query.offset ?? '0', 10) || 0;
  const search = normalizeUserSearch(request.query.search ?? '');

  const page = Math.floor(offset / limit) + 1;

  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(limit),
    });
    if (search) params.set('search', search);

    const res = await fetch(`${CORE_API_URL}/internal/users?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`svc-core-api responded ${res.status}`);
    }
    const json = (await res.json()) as CoreUserListResponse;

    const d = json.data;
    const users = (d.users ?? []).map((u: CoreUserItem) => ({
      user_id: u.id,
      telegram_id: u.telegram_id,
      phone_number: u.telegram_phone ?? '',
      first_name: u.first_name,
      last_name: u.last_name,
      username: u.username,
      email: u.email ?? null,
      is_premium: u.is_premium,
      business_count: u.business_count,
      portal_count: u.portal_count,
      worker_count: u.worker_count,
      role: null,
      status: 'active',
      created_at: u.created_at,
      updated_at: u.created_at,
    }));

    return reply.send({
      data: users,
      pagination: {
        total: d.total,
        limit,
        offset,
        pages: d.total_pages,
        totalPages: d.total_pages,
      },
    });
  } catch (err: unknown) {
    request.log.error({ err }, 'getCoreUsersHandler: failed to fetch from svc-core-api');
    return reply.status(502).send({ message: 'Failed to fetch users from core service' });
  }
};
