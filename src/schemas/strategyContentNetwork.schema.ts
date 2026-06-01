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

export const upsertContentNetworkSchema: FastifySchema = {
  tags: ['Strategy Content Network'],
  summary: 'Create or update content network slide data',
  description:
    'Stores business profile context, 2 purpose groups (channel building + seeding premise), content pillars with channel/topic/frequency/format/examples.',
  body: upsertBodyShape,
  response: { 200: upsertResponseShape },
};

export const getContentNetworkSchema: FastifySchema = {
  tags: ['Strategy Content Network'],
  summary: 'Get content network for strategy app',
  description:
    'Returns user-specific data when context exists, otherwise business-level, otherwise demo fallback. Includes 2 purpose groups: channel building & seeding premise.',
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
