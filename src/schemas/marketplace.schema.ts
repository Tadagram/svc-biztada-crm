import { FastifySchema } from 'fastify';

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

const stateShape = {
  type: 'object',
  properties: {
    listings: { type: 'array', items: { type: 'object', additionalProperties: true } },
    trades: { type: 'array', items: { type: 'object', additionalProperties: true } },
    withdrawals: { type: 'array', items: { type: 'object', additionalProperties: true } },
    actionKeys: { type: 'array', items: { type: 'string' } },
  },
};

export const getMarketplaceStateSchema: FastifySchema = {
  tags: ['Marketplace'],
  summary: 'Get marketplace state snapshot',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      businessId: { type: 'string', maxLength: 64 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: stateShape,
        meta: {
          type: 'object',
          properties: {
            businessId: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
    401: errorResponse,
  },
};

export const createMarketplaceListingSchema: FastifySchema = {
  tags: ['Marketplace'],
  summary: 'Create marketplace listing',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['actionKey', 'draft'],
    properties: {
      businessId: { type: 'string', maxLength: 64 },
      actionKey: { type: 'string', minLength: 8, maxLength: 120 },
      draft: {
        type: 'object',
        required: ['title', 'type', 'credits', 'banner', 'description'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 120 },
          type: { type: 'string', enum: ['seeding', 'ai'] },
          credits: { type: 'string', minLength: 1, maxLength: 20 },
          banner: { type: 'string', minLength: 1, maxLength: 120 },
          description: { type: 'string', minLength: 1, maxLength: 300 },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            listing: { type: 'object', additionalProperties: true },
            state: stateShape,
          },
        },
      },
    },
    400: errorResponse,
    401: errorResponse,
    409: errorResponse,
  },
};

export const requestMarketplaceWithdrawalSchema: FastifySchema = {
  tags: ['Marketplace'],
  summary: 'Request marketplace withdrawal',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['actionKey', 'draft'],
    properties: {
      businessId: { type: 'string', maxLength: 64 },
      actionKey: { type: 'string', minLength: 8, maxLength: 120 },
      draft: {
        type: 'object',
        required: ['amount', 'destination'],
        properties: {
          amount: { type: 'string', minLength: 1, maxLength: 20 },
          destination: { type: 'string', minLength: 1, maxLength: 150 },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            withdrawal: { type: 'object', additionalProperties: true },
            state: stateShape,
          },
        },
      },
    },
    400: errorResponse,
    401: errorResponse,
    409: errorResponse,
  },
};
