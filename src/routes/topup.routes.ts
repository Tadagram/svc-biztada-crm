import { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod } from 'fastify';
import {
  submitTopUpHandler,
  approveTopUpHandler,
  rejectTopUpHandler,
  listTopUpsHandler,
  myTopUpsHandler,
  getTopUpHandler,
  streamTopUpHandler,
  getCreditBalanceHandler,
  listCreditLedgerHandler,
  deductCreditHandler,
  internalDeductCreditHandler,
  internalRefundCreditHandler,
} from '@handlers/topup';
import {
  submitTopUpSchema,
  approveTopUpSchema,
  rejectTopUpSchema,
  listTopUpsSchema,
  myTopUpsSchema,
  getTopUpSchema,
  streamTopUpSchema,
  getCreditBalanceSchema,
  listCreditLedgerSchema,
  deductCreditSchema,
  internalDeductCreditSchema,
  internalRefundCreditSchema,
} from '@schemas/topup.schema';

async function topupRoutes(fastify: FastifyInstance) {
  const verifyInternalToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const expected = process.env.INTERNAL_TOKEN ?? '';
    if (!expected) {
      return;
    }
    const incoming = (request.headers['x-internal-token'] ?? '').toString();
    if (!incoming || incoming !== expected) {
      return reply.status(401).send({ error: 'internal_unauthorized' });
    }
  };

  // ── SSE stream — must be before /:topupId to avoid route conflict ───────────
  // GET /topup/stream — realtime events for reviewers
  fastify.get(
    '/stream',
    {
      schema: streamTopUpSchema,
      preHandler: [
        async (request: FastifyRequest, reply: FastifyReply) => {
          const query = request.query as { token?: string };
          if (query.token && !request.headers['authorization']) {
            request.headers['authorization'] = `Bearer ${query.token}`;
          }
          await fastify.authenticate(request, reply);
          if (reply.sent) return;
          await fastify.requirePermission('topup:review')(request, reply);
        },
      ],
    },
    streamTopUpHandler as RouteHandlerMethod,
  );

  // ── Customer routes ──────────────────────────────────────────────────────────

  // POST /topup/submit — submit a top-up request
  fastify.post(
    '/submit',
    {
      schema: submitTopUpSchema,
      preHandler: [fastify.authenticate],
    },
    submitTopUpHandler as RouteHandlerMethod,
  );

  // GET /topup/me — my top-up history (cursor-paginated)
  fastify.get(
    '/me',
    {
      schema: myTopUpsSchema,
      preHandler: [fastify.authenticate],
    },
    myTopUpsHandler as RouteHandlerMethod,
  );

  // GET /topup/credits/balance — current user's credit balance
  fastify.get(
    '/credits/balance',
    {
      schema: getCreditBalanceSchema,
      preHandler: [fastify.authenticate],
    },
    getCreditBalanceHandler as RouteHandlerMethod,
  );

  // GET /topup/credits/ledger — credit ledger history
  fastify.get(
    '/credits/ledger',
    {
      schema: listCreditLedgerSchema,
      preHandler: [fastify.authenticate],
    },
    listCreditLedgerHandler as RouteHandlerMethod,
  );

  // POST /topup/credits/deduct — deduct credits after AI generation
  fastify.post(
    '/credits/deduct',
    {
      schema: deductCreditSchema,
      preHandler: [fastify.authenticate],
    },
    deductCreditHandler as RouteHandlerMethod,
  );

  // POST /topup/credits/internal/deduct — internal service-to-service debit
  fastify.post(
    '/credits/internal/deduct',
    {
      schema: internalDeductCreditSchema,
      preHandler: [verifyInternalToken],
    },
    internalDeductCreditHandler as RouteHandlerMethod,
  );

  // POST /topup/credits/internal/refund — internal service-to-service refund
  fastify.post(
    '/credits/internal/refund',
    {
      schema: internalRefundCreditSchema,
      preHandler: [verifyInternalToken],
    },
    internalRefundCreditHandler as RouteHandlerMethod,
  );

  // ── Reviewer routes ──────────────────────────────────────────────────────────

  // GET /topup — all requests (reviewer)
  fastify.get(
    '/',
    {
      schema: listTopUpsSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('topup:review')],
    },
    listTopUpsHandler as RouteHandlerMethod,
  );

  // GET /topup/:topupId — detail
  fastify.get(
    '/:topupId',
    {
      schema: getTopUpSchema,
      preHandler: [fastify.authenticate],
    },
    getTopUpHandler as RouteHandlerMethod,
  );

  // POST /topup/:topupId/approve
  fastify.post(
    '/:topupId/approve',
    {
      schema: approveTopUpSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('topup:review')],
    },
    approveTopUpHandler as RouteHandlerMethod,
  );

  // POST /topup/:topupId/reject
  fastify.post(
    '/:topupId/reject',
    {
      schema: rejectTopUpSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('topup:review')],
    },
    rejectTopUpHandler as RouteHandlerMethod,
  );
}

export default topupRoutes;
