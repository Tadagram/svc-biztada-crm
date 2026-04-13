import { FastifySchema } from 'fastify';

// Request body properties
const phoneNumberProperty = {
  type: 'string',
  minLength: 10,
  maxLength: 15,
  errorMessage: {
    type: 'Số điện thoại phải là một chuỗi (string).',
    minLength: 'Số điện thoại quá ngắn.',
    maxLength: 'Số điện thoại quá dài.',
  },
};

// User object in response
const userObject = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    role: { type: 'string' },
    agencyName: { type: ['string', 'null'] },
  },
};

// Success response (200)
const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    token: { type: 'string' },
    refreshToken: { type: 'string' },
    user: userObject,
  },
};

// Not found response (404)
const notFoundResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

// Forbidden response (403)
const forbiddenResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

// Server error response (500)
const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

export const verifyUserSchema: FastifySchema = {
  tags: ['Authentication'],
  description: 'Verify user phone number and get JWT tokens for authentication',
  summary: 'Verify User Phone',
  body: {
    type: 'object',
    required: ['phoneNumber'],
    properties: {
      phoneNumber: phoneNumberProperty,
    },
  },
  response: {
    200: {
      description: 'User verified successfully - returns JWT and refresh tokens',
      ...successResponse,
    },
    404: {
      description: 'User phone number not found',
      ...notFoundResponse,
    },
    403: {
      description: 'User account is disabled or inactive',
      ...forbiddenResponse,
    },
    500: {
      description: 'Internal server error',
      ...errorResponse,
    },
  },
};
