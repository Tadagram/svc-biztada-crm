import { FastifyInstance } from 'fastify';
import {
  assignWorkerToAgencyHandler,
  getAgencyWorkersHandler,
  revokeAgencyWorkerHandler,
  assignWorkerToUserHandler,
  releaseWorkerHandler,
} from '@handlers/agencyWorker';
import {
  assignWorkerToAgencySchema,
  getAgencyWorkersSchema,
  revokeAgencyWorkerSchema,
  assignWorkerToUserSchema,
  releaseWorkerSchema,
} from '@schemas/agencyWorker.schema';

export default async function agencyWorkerRoutes(fastify: FastifyInstance) {
  // POST /agency-workers — Assign worker to agency
  fastify.post('/', { schema: assignWorkerToAgencySchema }, assignWorkerToAgencyHandler);

  // GET /agency-workers — List all assignments (filterable by agency, status)
  fastify.get('/', { schema: getAgencyWorkersSchema }, getAgencyWorkersHandler);

  // DELETE /agency-workers/:agencyWorkerId — Revoke assignment
  fastify.delete(
    '/:agencyWorkerId',
    { schema: revokeAgencyWorkerSchema },
    revokeAgencyWorkerHandler,
  );

  // POST /agency-workers/:agencyWorkerId/assign-user — Assign worker to a user
  fastify.post(
    '/:agencyWorkerId/assign-user',
    { schema: assignWorkerToUserSchema },
    assignWorkerToUserHandler,
  );

  // POST /agency-workers/:agencyWorkerId/release — Release worker from user
  fastify.post('/:agencyWorkerId/release', { schema: releaseWorkerSchema }, releaseWorkerHandler);
}
