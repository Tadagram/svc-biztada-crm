import { FastifySchema } from 'fastify';

export const registerGuestSchema: FastifySchema = {
  tags: ['Strategy Guest'],
  summary: 'Register a guest user (phone + business name)',
  description:
    'Creates or finds a guest record by phone number. Returns a guestId that can be used as the sole identifier for all strategy slide data. No auth required.',
  body: {
    type: 'object',
    required: ['phone', 'businessName'],
    properties: {
      phone: { type: 'string', minLength: 7, maxLength: 20 },
      businessName: { type: 'string', minLength: 1, maxLength: 255 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            guestId: { type: 'string' },
            phone: { type: 'string' },
            businessName: { type: 'string' },
            isNew: { type: 'boolean' },
          },
        },
      },
    },
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            guestId: { type: 'string' },
            phone: { type: 'string' },
            businessName: { type: 'string' },
            isNew: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const loginGuestSchema: FastifySchema = {
  tags: ['Strategy Guest'],
  summary: 'Login as an existing guest (phone lookup)',
  description:
    'Looks up a guest by phone number. Returns guestId and businessName so returning users can resume their saved strategy data. Returns 404 if phone not registered.',
  querystring: {
    type: 'object',
    required: ['phone'],
    properties: {
      phone: { type: 'string', minLength: 7, maxLength: 20 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            guestId: { type: 'string' },
            phone: { type: 'string' },
            businessName: { type: 'string' },
          },
        },
      },
    },
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
  },
};

