import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  createWorkerHandler,
  getWorkersHandler,
  getWorkerByIdHandler,
  updateWorkerHandler,
  deleteWorkerHandler,
  reactivateWorkerHandler,
  getActiveWorkersHandler,
} from '@handlers/worker';
import {
  createWorkerSchema,
  getWorkersSchema,
  getWorkerByIdSchema,
  updateWorkerSchema,
  deleteWorkerSchema,
  reactivateWorkerSchema,
  getActiveWorkersSchema,
} from '@schemas/worker.schema';

async function workerRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      schema: createWorkerSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('workers:create')],
    },
    createWorkerHandler as RouteHandlerMethod,
  );
  fastify.get(
    '/',
    {
      schema: getWorkersSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('workers:read')],
    },
    getWorkersHandler as RouteHandlerMethod,
  );
  fastify.get(
    '/active',
    {
      schema: getActiveWorkersSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('workers:read')],
    },
    getActiveWorkersHandler as RouteHandlerMethod,
  );
  fastify.get(
    '/:workerId',
    {
      schema: getWorkerByIdSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('workers:read')],
    },
    getWorkerByIdHandler as RouteHandlerMethod,
  );
  fastify.put(
    '/:workerId',
    {
      schema: updateWorkerSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('workers:update')],
    },
    updateWorkerHandler as RouteHandlerMethod,
  );
  fastify.delete(
    '/:workerId',
    {
      schema: deleteWorkerSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('workers:delete')],
    },
    deleteWorkerHandler as RouteHandlerMethod,
  );
  fastify.patch(
    '/:workerId/reactivate',
    {
      schema: reactivateWorkerSchema,
      preHandler: [fastify.authenticate, fastify.requirePermission('workers:update')],
    },
    reactivateWorkerHandler as RouteHandlerMethod,
  );
}

export default workerRoutes;
