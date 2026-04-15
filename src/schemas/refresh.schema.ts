import { FastifySchema } from 'fastify';

// Success response (200)
const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    token: { type: 'string' },
  },
};

// Unauthorized response (401)
const unauthorizedResponse = {
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

export const refreshTokenSchema: FastifySchema = {
  tags: ['Authentication'],
  description:
    'Refresh expired JWT token. Send expired access token in Authorization header. Backend validates session in DB.',
  summary: 'Refresh JWT Token',
  response: {
    200: {
      description: 'Token refreshed successfully - returns new JWT token',
      ...successResponse,
    },
    401: {
      description: 'Invalid or expired session',
      ...unauthorizedResponse,
    },
    500: {
      description: 'Internal server error',
      ...errorResponse,
    },
  },
};
