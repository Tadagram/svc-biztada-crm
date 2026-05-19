import { FastifyRequest, FastifyReply } from 'fastify';

interface EligibleUsersQuery {
  min_spend?: string;
  max_spend?: string;
  limit?: string;
  offset?: string;
}

export async function handler(
  request: FastifyRequest<{ Querystring: EligibleUsersQuery }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { min_spend, max_spend, limit = '50', offset = '0' } = request.query;

  const limitNum = Math.min(Number(limit) || 50, 200);
  const offsetNum = Number(offset) || 0;

  const minSpend = min_spend !== undefined ? Number(min_spend) : undefined;
  const maxSpend = max_spend !== undefined ? Number(max_spend) : undefined;

  // Raw query to group purchases by user and filter by total spend
  const havingClauses: string[] = [];
  const params: number[] = [];

  if (minSpend !== undefined) {
    havingClauses.push('total_spend >= ?');
    params.push(minSpend);
  }
  if (maxSpend !== undefined) {
    havingClauses.push('total_spend <= ?');
    params.push(maxSpend);
  }

  const havingSql = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : '';

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      user_id: string;
      phone_number: string;
      agency_name: string | null;
      role: string | null;
      status: string;
      total_spend: number;
    }>
  >(
    `
    SELECT
      u.user_id,
      u.phone_number,
      u.agency_name,
      u.role,
      u.status,
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.total_price_usd ELSE 0 END), 0) AS total_spend
    FROM users u
    LEFT JOIN service_package_purchases p ON p.user_id = u.user_id
    WHERE u.deleted_at IS NULL
    GROUP BY u.user_id, u.phone_number, u.agency_name, u.role, u.status
    ${havingSql}
    ORDER BY total_spend DESC, u.created_at DESC
    LIMIT ? OFFSET ?
    `,
    ...params,
    limitNum,
    offsetNum,
  );

  const countRows = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
    `
    SELECT COUNT(*) AS total FROM (
      SELECT u.user_id,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.total_price_usd ELSE 0 END), 0) AS total_spend
      FROM users u
      LEFT JOIN service_package_purchases p ON p.user_id = u.user_id
      WHERE u.deleted_at IS NULL
      GROUP BY u.user_id
      ${havingSql}
    ) t
    `,
    ...params,
  );

  return reply.send({
    data: rows.map((r) => ({
      user_id: r.user_id,
      phone_number: r.phone_number,
      agency_name: r.agency_name,
      role: r.role,
      status: r.status,
      total_spend: Number(r.total_spend),
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit: limitNum,
    offset: offsetNum,
  });
}
