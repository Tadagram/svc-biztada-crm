import { FastifySchema } from 'fastify';

const usageLogResponse = {
  type: 'object',
  properties: {
    usage_log_id: { type: 'string' },
    worker_id: { type: 'string' },
    agency_user_id: { type: 'string' },
    user_id: { type: 'string' },
    start_at: { type: 'string' },
    end_at: { type: ['string', 'null'] },
    metadata: {},
    created_at: { type: 'string' },
    worker: {
      type: 'object',
      properties: {
        worker_id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string' },
      },
    },
    agency: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        agency_name: { type: ['string', 'null'] },
        phone_number: { type: 'string' },
      },
    },
    user: {
      type: 'object',
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
  },
};

export const getUsageLogsSchema: FastifySchema = {
  tags: ['Usage Logs'],
  summary: 'Get Usage Logs',
  description:
    'Returns worker usage history. Filterable by workerId, agencyId, userId. Supports pagination.',
  querystring: {
    type: 'object',
    properties: {
      workerId: { type: 'string', format: 'uuid', description: 'Filter by worker ID' },
      agencyId: { type: 'string', format: 'uuid', description: 'Filter by agency user ID' },
      userId: { type: 'string', format: 'uuid', description: 'Filter by user ID' },
      limit: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
      offset: { type: 'integer', default: 0, minimum: 0 },
      open: { type: 'boolean', description: 'If true, return only ongoing (not yet closed) logs' },
    },
  },
  response: {
    200: {
      description: 'Usage logs retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: usageLogResponse },
        pagination: paginationResponse,
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        error: { type: 'string' },
      },
    },
  },
};
