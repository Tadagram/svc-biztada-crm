import { FastifySchema } from 'fastify';

const phoneNumberProperty = {
  type: 'string',
  minLength: 10,
  maxLength: 15,
  pattern: '^(\\+84|0)[0-9]{9,10}$',
  errorMessage: {
    type: 'Số điện thoại phải là một chuỗi (string).',
    minLength: 'Số điện thoại quá ngắn.',
    maxLength: 'Số điện thoại quá dài.',
    pattern: 'Số điện thoại không hợp lệ.',
  },
};

const userObject = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    role: { type: 'string' },
    agencyName: { type: ['string', 'null'] },
  },
};

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

const notFoundResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

const forbiddenResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

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
