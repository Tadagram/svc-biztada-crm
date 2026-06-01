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

export const upsertDirectionSchema: FastifySchema = {
  tags: ['Strategy Direction'],
  summary: 'Create or update strategic direction slide data',
  description:
    'Stores overall strategic direction: business summary, core challenge, strategic north, 5 pillars with linked sections, implementation logic, and key assumptions.',
  body: upsertBodyShape,
  response: { 200: upsertResponseShape },
};

export const getDirectionSchema: FastifySchema = {
  tags: ['Strategy Direction'],
  summary: 'Get strategic direction data for a guest or business',
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
            id: { type: ['string', 'null'] },
            businessId: { type: 'string' },
            userId: { type: ['string', 'null'] },
            guestId: { type: ['string', 'null'] },
            isDemo: { type: 'boolean' },
            updatedAt: {},
            usedFallbackDemo: { type: 'boolean' },
          },
        },
      },
    },
  },
};
