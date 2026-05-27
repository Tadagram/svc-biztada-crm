import { FastifySchema } from 'fastify';

export const getActionPlanSchema: FastifySchema = {
  tags: ['Strategy Plan'],
  summary: 'Get action plan data for strategy app',
  description:
    'Public endpoint. Returns user-specific data when context exists, otherwise business-level, otherwise demo fallback dataset.',
  querystring: {
    type: 'object',
    properties: {
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
