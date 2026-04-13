import { FastifyInstance } from 'fastify';
import {
  createWorkerHandler,
  getWorkersHandler,
  getWorkerByIdHandler,
  updateWorkerHandler,
  deleteWorkerHandler,
  getActiveWorkersHandler,
} from '@handlers/worker';
import {
  createWorkerSchema,
  getWorkersSchema,
  getWorkerByIdSchema,
  updateWorkerSchema,
  deleteWorkerSchema,
  getActiveWorkersSchema,
} from '@schemas/worker.schema';

async function workerRoutes(fastify: FastifyInstance) {
  fastify.post('/', { schema: createWorkerSchema }, createWorkerHandler);
  fastify.get('/', { schema: getWorkersSchema }, getWorkersHandler);
  // /workers/active must come BEFORE /:workerId to avoid route conflict
  fastify.get('/active', { schema: getActiveWorkersSchema }, getActiveWorkersHandler);
  fastify.get('/:workerId', { schema: getWorkerByIdSchema }, getWorkerByIdHandler);
  fastify.put('/:workerId', { schema: updateWorkerSchema }, updateWorkerHandler);
  fastify.delete('/:workerId', { schema: deleteWorkerSchema }, deleteWorkerHandler);
}

export default workerRoutes;
