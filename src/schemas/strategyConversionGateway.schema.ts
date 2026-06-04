import { FastifySchema } from 'fastify';

export const getConversionGatewaySchema: FastifySchema = {
  tags: ['Strategy', 'ConversionGateway'],
  summary: 'Lấy cấu hình ConversionGateway',
  querystring: {
    type: 'object',
    properties: {
      guestId: { type: 'string' },
      businessId: { type: 'string' },
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          additionalProperties: true,
        },
        meta: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            id: { type: ['string', 'null'] },
            businessId: { type: ['string', 'null'] },
            userId: { type: ['string', 'null'] },
            guestId: { type: ['string', 'null'] },
            isDemo: { type: 'boolean' },
            updatedAt: { type: 'string', format: 'date-time' },
            usedFallbackDemo: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const upsertConversionGatewaySchema: FastifySchema = {
  tags: ['Strategy', 'ConversionGateway'],
  summary: 'Lưu cấu hình ConversionGateway',
  body: {
    type: 'object',
    required: ['payload'],
    properties: {
      guestId: { type: 'string' },
      businessId: { type: 'string' },
      userId: { type: 'string' },
      payload: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
  },
};
