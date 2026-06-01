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

export const upsertBrandlabsSchema: FastifySchema = {
  tags: ['Strategy Brandlabs'],
  summary: 'Create or update brandlabs operations slide data',
  description: 'Stores source channels, remake direction, auto-schedule, seeding config and marketing workflows.',
  body: upsertBodyShape,
  response: { 200: upsertResponseShape },
};

export const getBrandlabsSchema: FastifySchema = {
  tags: ['Strategy Brandlabs'],
  summary: 'Get brandlabs operations plan for strategy app',
  description: 'Returns user-specific data when context exists, otherwise business-level, otherwise demo fallback.',
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
        data: { type: 'object', additionalProperties: true },
        meta: {
          type: 'object',
          properties: {
            source: { type: 'string', enum: ['guest', 'user', 'business', 'demo'] },
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
