import { FastifySchema } from 'fastify';

const workerDataResponse = {
  type: 'object',
  properties: {
    worker_uuid: { type: 'string' },
    worker_type: { type: 'string' },
    worker_mode: { type: 'string' },
    ip_type: { type: 'string' },
    user_id: { type: ['string', 'null'] },
    expires_at: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    status: { type: ['string', 'null'] },
    last_heartbeat: { type: ['string', 'null'] },
    url: { type: ['string', 'null'] },
  },
};

const paginationResponse = {
  type: 'object',
  properties: {
    total: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
    pages: { type: 'integer' },
    totalPages: { type: 'integer' },
    currentPage: { type: 'integer' },
    all: { type: 'boolean' },
  },
};

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    error: { type: 'string' },
  },
};

const notFoundResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

export const createWorkerSchema: FastifySchema = {
  tags: ['Workers'],
  summary: 'Create Worker',
  description: 'Create a new worker (MOD only)',
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Worker name',
      },
      status: {
        type: 'string',
        enum: ['ready', 'busy', 'offline'],
        default: 'ready',
      },
    },
  },
  response: {
    201: {
      description: 'Worker created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: workerDataResponse,
        message: { type: 'string' },
      },
    },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

export const getWorkersSchema: FastifySchema = {
  tags: ['Workers'],
  summary: 'Get Workers',
  description: 'Retrieve workers with pagination and filters',
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      search: { type: 'string' },
      worker_type: { type: 'string' },
      worker_mode: { type: 'string' },
      status: { type: 'string' },
      user_id: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Workers retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: workerDataResponse },
        pagination: paginationResponse,
        message: { type: 'string' },
      },
    },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

export const getWorkerByIdSchema: FastifySchema = {
  tags: ['Workers'],
  summary: 'Get Worker by ID',
  description: 'Retrieve a single worker with its current assignment info',
  params: {
    type: 'object',
    required: ['workerId'],
    properties: {
      workerId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      description: 'Worker retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            worker_id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
            agency_workers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  agency_worker_id: { type: 'string' },
                  status: { type: 'string' },
                  using_by: { type: ['string', 'null'] },
                  agency: {
                    type: 'object',
                    properties: {
                      user_id: { type: 'string' },
                      agency_name: { type: ['string', 'null'] },
                      phone_number: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
    404: { description: 'Worker not found', ...notFoundResponse },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

export const updateWorkerSchema: FastifySchema = {
  tags: ['Workers'],
  summary: 'Update Worker',
  description: 'Update worker name or status',
  params: {
    type: 'object',
    required: ['workerId'],
    properties: {
      workerId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      status: { type: 'string', enum: ['ready', 'busy', 'offline'] },
    },
  },
  response: {
    200: {
      description: 'Worker updated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: workerDataResponse,
        message: { type: 'string' },
      },
    },
    404: { description: 'Worker not found', ...notFoundResponse },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

export const deleteWorkerSchema: FastifySchema = {
  tags: ['Workers'],
  summary: 'Delete Worker',
  description: 'Soft delete a worker (cannot delete if has active assignments)',
  params: {
    type: 'object',
    required: ['workerId'],
    properties: {
      workerId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      description: 'Worker deleted successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            worker_id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string' },
            deleted_at: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
    404: { description: 'Worker not found', ...notFoundResponse },
    409: {
      description: 'Worker has active assignments',
      ...notFoundResponse,
    },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

export const reactivateWorkerSchema: FastifySchema = {
  tags: ['Workers'],
  summary: 'Reactivate Worker',
  description: 'Restore a soft-deleted worker back to offline status',
  params: {
    type: 'object',
    required: ['workerId'],
    properties: {
      workerId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      description: 'Worker reactivated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: workerDataResponse,
        message: { type: 'string' },
      },
    },
    404: { description: 'Worker not found', ...notFoundResponse },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

const activeAssignmentResponse = {
  type: 'object',
  properties: {
    agency_worker_id: { type: 'string' },
    agency_user_id: { type: 'string' },
    worker_id: { type: 'string' },
    using_by: { type: ['string', 'null'] },
    status: { type: 'string' },
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

export const getActiveWorkersSchema: FastifySchema = {
  tags: ['Workers'],
  summary: 'Get Active Workers',
  description: 'Returns all active agency-worker assignments, optionally filtered by agency.',
  querystring: {
    type: 'object',
    properties: {
      agencyId: { type: 'string', format: 'uuid', description: 'Filter by agency user ID' },
    },
  },
  response: {
    200: {
      description: 'Active workers retrieved',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: activeAssignmentResponse },
        total: { type: 'integer' },
        message: { type: 'string' },
      },
    },
    500: { description: 'Internal server error', ...errorResponse },
  },
};
