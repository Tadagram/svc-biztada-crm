import { FastifySchema } from 'fastify';

const upsertResponseShape = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object', additionalProperties: true },
    meta: {
      type: 'object',
      properties: {
        created: { type: 'boolean' },
        id: { type: 'string' },
        guestId: { type: ['string', 'null'] },
        businessId: { type: ['string', 'null'] },
        userId: { type: ['string', 'null'] },
      },
    },
  },
} as const;

const upsertBodyShape = {
  type: 'object',
  required: ['payload'],
  properties: {
    guestId: { type: 'string', maxLength: 36 },
    businessId: { type: 'string', maxLength: 64 },
    userId: { type: 'string', maxLength: 64 },
    payload: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
} as const;

export const upsertFactorySchema: FastifySchema = {
  tags: ['Strategy Factory'],
  summary: 'Create or update factory slide data',
  description: 'Public upsert endpoint. If businessId/userId not provided, defaults to demo row.',
  body: upsertBodyShape,
  response: { 200: upsertResponseShape },
};

export const getFactorySchema: FastifySchema = {
  tags: ['Strategy Factory'],
  summary: 'Get content factory/production data for strategy app',
  description:
    'Public endpoint. Returns user-specific data when context exists, otherwise business-level, otherwise demo fallback dataset.',
  querystring: {
    type: 'object',
    properties: {
      guestId: { type: 'string', maxLength: 36 },
      businessId: { type: 'string', maxLength: 64 },
      userId: { type: 'string', maxLength: 64 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
        meta: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            guestId: { type: ['string', 'null'] },
            businessId: { type: 'string' },
            userId: { type: ['string', 'null'] },
            usedFallbackDemo: { type: 'boolean' },
            updatedAt: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
};
