import { FastifySchema } from 'fastify';

const agencyWorkerDataResponse = {
  type: 'object',
  properties: {
    agency_worker_id: { type: 'string' },
    agency_user_id: { type: 'string' },
    worker_id: { type: 'string' },
    status: { type: 'string' },
    using_by: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    agency: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        agency_name: { type: ['string', 'null'] },
        phone_number: { type: 'string' },
      },
    },
    worker: {
      type: 'object',
      properties: {
        worker_id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string' },
      },
    },
    user: {
      type: ['object', 'null'],
      properties: {
        user_id: { type: 'string' },
        phone_number: { type: 'string' },
        role: { type: 'string' },
      },
    },
  },
};

const paginationResponse = {
  type: 'object',
  properties: {
    total: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
    totalPages: { type: 'integer' },
    currentPage: { type: 'integer' },
    all: { type: 'boolean' },
  },
};

export const assignWorkerToAgencySchema: FastifySchema = {
  tags: ['AgencyWorker'],
  summary: 'Assign a worker to an agency',
  body: {
    type: 'object',
    required: ['agency_user_id', 'worker_id'],
    properties: {
      agency_user_id: { type: 'string', format: 'uuid' },
      worker_id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: agencyWorkerDataResponse,
        message: { type: 'string' },
      },
    },
  },
};

export const getAgencyWorkersSchema: FastifySchema = {
  tags: ['AgencyWorker'],
  summary: 'Get list of agency worker assignments',
  querystring: {
    type: 'object',
    properties: {
      agency_user_id: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: ['active', 'completed', 'revoked'] },
      limit: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
      offset: { type: 'integer', default: 0, minimum: 0 },
      all: { type: 'boolean', description: 'Return all assignments without pagination' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: agencyWorkerDataResponse },
        pagination: paginationResponse,
        message: { type: 'string' },
      },
    },
  },
};

export const revokeAgencyWorkerSchema: FastifySchema = {
  tags: ['AgencyWorker'],
  summary: 'Revoke a worker assignment from an agency',
  params: {
    type: 'object',
    required: ['agencyWorkerId'],
    properties: {
      agencyWorkerId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const assignWorkerToUserSchema: FastifySchema = {
  tags: ['AgencyWorker'],
  summary: 'Assign a worker to a specific user under an agency',
  params: {
    type: 'object',
    required: ['agencyWorkerId'],
    properties: {
      agencyWorkerId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['user_id'],
    properties: {
      user_id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const reactivateAgencyWorkerSchema: FastifySchema = {
  tags: ['AgencyWorker'],
  summary: 'Reactivate a revoked worker assignment',
  params: {
    type: 'object',
    required: ['agencyWorkerId'],
    properties: {
      agencyWorkerId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const releaseWorkerSchema: FastifySchema = {
  tags: ['AgencyWorker'],
  summary: 'Release a worker from the user it is assigned to',
  params: {
    type: 'object',
    required: ['agencyWorkerId'],
    properties: {
      agencyWorkerId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
