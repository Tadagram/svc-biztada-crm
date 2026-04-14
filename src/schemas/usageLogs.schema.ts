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
    'Returns worker usage history. Filterable by workerId/workerName, agencyId, userId, from, to. Supports pagination.',
  querystring: {
    type: 'object',
    properties: {
      workerId: { type: 'string', format: 'uuid', description: 'Filter by worker ID' },
      workerName: { type: 'string', description: 'Filter by worker name (partial match)' },
      agencyId: { type: 'string', format: 'uuid', description: 'Filter by agency user ID' },
      userId: { type: 'string', format: 'uuid', description: 'Filter by user ID' },
      limit: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
      offset: { type: 'integer', default: 0, minimum: 0 },
      open: { type: 'boolean', description: 'If true, return only ongoing logs' },
      from: { type: 'string', description: 'ISO date string – start_at >= from' },
      to: { type: 'string', description: 'ISO date string – start_at <= to' },
      all: { type: 'boolean', description: 'If true, return all records (no pagination)' },
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

export const getUsageLogsByWorkerSchema: FastifySchema = {
  tags: ['Usage Logs'],
  summary: 'Get Usage Logs grouped by Worker',
  description:
    'Returns paginated workers with aggregate log stats (total sessions, active sessions, last used).',
  querystring: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'ISO date string – filter logs where start_at >= from' },
      to: { type: 'string', description: 'ISO date string – filter logs where start_at <= to' },
      agencyId: { type: 'string', format: 'uuid', description: 'Filter by agency user ID' },
      workerName: { type: 'string', description: 'Filter by worker name (partial match)' },
      limit: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
      offset: { type: 'integer', default: 0, minimum: 0 },
    },
  },
  response: {
    200: {
      description: 'Usage logs by worker retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              worker_id: { type: 'string' },
              worker: {
                type: 'object',
                properties: {
                  worker_id: { type: 'string' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                },
              },
              total_sessions: { type: 'integer' },
              active_sessions: { type: 'integer' },
              last_used_at: { type: ['string', 'null'] },
            },
          },
        },
        pagination: paginationResponse,
      },
    },
  },
};
