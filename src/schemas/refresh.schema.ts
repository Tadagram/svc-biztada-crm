import { FastifySchema } from 'fastify';

// Request body properties
const refreshTokenProperty = {
  type: 'string',
  errorMessage: {
    type: 'Refresh Token phải là một chuỗi (string).',
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
  description: 'Refresh expired JWT token using valid refresh token',
  summary: 'Refresh JWT Token',
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: refreshTokenProperty,
    },
  },
  response: {
    200: {
      description: 'Token refreshed successfully - returns new JWT token',
      ...successResponse,
    },
    401: {
      description: 'Invalid or expired refresh token',
      ...unauthorizedResponse,
    },
    500: {
      description: 'Internal server error',
      ...errorResponse,
    },
  },
};
