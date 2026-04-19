import { FastifyRequest, FastifyReply } from 'fastify';
import {
  PrismaClient,
  CreditLedgerEntryType,
  CreditLedgerDirection,
  UserRole,
} from '@prisma/client';
import { hasPermission } from '@handlers/permission/permissionHelper';

interface IListCreditLedgerQuery {
  user_id?: string;
  entry_type?: CreditLedgerEntryType;
  direction?: CreditLedgerDirection;
  source_channel?: 'DIRECT' | 'WHITELABEL';
  limit?: number;
  before?: string;
}

function buildWhere(query: IListCreditLedgerQuery, resolvedUserId?: string) {
  return {
    ...(resolvedUserId ? { user_id: resolvedUserId } : {}),
    ...(query.entry_type ? { entry_type: query.entry_type } : {}),
    ...(query.direction ? { direction: query.direction } : {}),
    ...(query.source_channel ? { source_channel: query.source_channel } : {}),
    ...(query.before ? { created_at: { lt: new Date(query.before) } } : {}),
  };
}

async function canReviewAll(prisma: PrismaClient, callerUserId: string, callerRole: string | null) {
  if (callerRole === null || callerRole === UserRole.mod) return true;
  return hasPermission(prisma, callerUserId, callerRole, 'topup:review');
}

export async function handler(
  request: FastifyRequest<{ Querystring: IListCreditLedgerQuery }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const query = request.query;

  const limit = Math.min(Number(query.limit ?? 20), 100);
  const reviewer = await canReviewAll(prisma, caller.userId, caller.role);

  let resolvedUserId: string | undefined;
  if (reviewer) {
    resolvedUserId = query.user_id;
  } else {
    resolvedUserId = caller.userId;
  }

  const where = buildWhere(query, resolvedUserId);

  const rows = await prisma.creditLedgerEntries.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    include: {
      user: { select: { user_id: true, phone_number: true, agency_name: true } },
      topup: {
        select: {
          topup_id: true,
          amount: true,
          currency: true,
          credit_amount: true,
          source_channel: true,
          sales_agency_uuid: true,
          status: true,
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && data.length > 0 ? data[data.length - 1].created_at.toISOString() : null;

  return reply.send({
    success: true,
    data,
    cursor: {
      nextCursor,
      hasMore,
      limit,
    },
  });
}
