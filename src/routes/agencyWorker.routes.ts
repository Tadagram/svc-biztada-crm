import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  assignWorkerToAgencyHandler,
  getAgencyWorkersHandler,
  revokeAgencyWorkerHandler,
  reactivateAgencyWorkerHandler,
  assignWorkerToUserHandler,
  releaseWorkerHandler,
} from '@handlers/agencyWorker';
import {
  assignWorkerToAgencySchema,
  getAgencyWorkersSchema,
  revokeAgencyWorkerSchema,
  reactivateAgencyWorkerSchema,
  assignWorkerToUserSchema,
  releaseWorkerSchema,
} from '@schemas/agencyWorker.schema';

export default async function agencyWorkerRoutes(fastify: FastifyInstance) {
  // POST /agency-workers — Assign worker to agency
  fastify.post(
    '/',
    {
      schema: assignWorkerToAgencySchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('agency_workers:assign')],
    },
    assignWorkerToAgencyHandler as RouteHandlerMethod,
  );

  // GET /agency-workers
  fastify.get(
    '/',
    {
      schema: getAgencyWorkersSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('agency_workers:read')],
    },
    getAgencyWorkersHandler as RouteHandlerMethod,
  );

  // DELETE /agency-workers/:agencyWorkerId
  fastify.delete(
    '/:agencyWorkerId',
    {
      schema: revokeAgencyWorkerSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('agency_workers:revoke')],
    },
    revokeAgencyWorkerHandler as RouteHandlerMethod,
  );

  // PATCH /agency-workers/:agencyWorkerId/reactivate
  fastify.patch(
    '/:agencyWorkerId/reactivate',
    {
      schema: reactivateAgencyWorkerSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('agency_workers:revoke')],
    },
    reactivateAgencyWorkerHandler as RouteHandlerMethod,
  );

  // POST /agency-workers/:agencyWorkerId/assign-user
  fastify.post(
    '/:agencyWorkerId/assign-user',
    {
      schema: assignWorkerToUserSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('agency_workers:assign_user')],
    },
    assignWorkerToUserHandler as RouteHandlerMethod,
  );

  // POST /agency-workers/:agencyWorkerId/release
  fastify.post(
    '/:agencyWorkerId/release',
    {
      schema: releaseWorkerSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('agency_workers:release')],
    },
    releaseWorkerHandler as RouteHandlerMethod,
  );
}
