import { FastifySchema } from 'fastify';

const phoneNumberProperty = {
  type: 'string',
  minLength: 10,
  errorMessage: {
    type: 'Số điện thoại phải là một chuỗi (string).',
    minLength: 'Số điện thoại quá ngắn (tối thiểu 10 ký tự).',
  },
};

const agencyNameProperty = {
  type: 'string',
  minLength: 3,
  errorMessage: {
    type: 'Tên doanh nghiệp phải là một chuỗi (string).',
    minLength: 'Tên doanh nghiệp quá ngắn (tối thiểu 3 ký tự).',
  },
};

const roleProperty = {
  type: 'string',
  enum: ['mod', 'agency', 'user', 'customer'],
  errorMessage: {
    type: 'Vai trò phải là một chuỗi (string).',
    enum: 'Vai trò phải là: mod, agency, user hoặc customer.',
  },
};

const statusProperty = {
  type: 'string',
  enum: ['active', 'disabled'],
  errorMessage: {
    type: 'Trạng thái phải là một chuỗi (string).',
    enum: 'Trạng thái phải là: active hoặc disabled.',
  },
};

const parentUserIdProperty = {
  type: 'string',
  format: 'uuid',
  errorMessage: {
    type: 'Parent User ID phải là một chuỗi (string).',
    format: 'Parent User ID phải đúng định dạng UUID.',
  },
};

const userDataResponse = {
  type: 'object',
  properties: {
    user_id: { type: 'string' },
    phone_number: { type: 'string' },
    agency_name: { type: ['string', 'null'] },
    role: { type: 'string' },
    status: { type: 'string' },
    created_at: { type: 'string' },
  },
};

const successResponse = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    message: { type: 'string' },
    data: userDataResponse,
  },
};

const conflictResponse = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const errorResponse = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

export const createUserSchema: FastifySchema = {
  tags: ['Users'],
  description: 'Create a new user account with phone number and optional details',
  summary: 'Create User',
  body: {
    type: 'object',
    required: ['phone_number'],
    properties: {
      phone_number: phoneNumberProperty,
      agency_name: agencyNameProperty,
      parent_user_id: parentUserIdProperty,
      role: roleProperty,
      status: statusProperty,
    },
  },
  response: {
    201: {
      description: 'User created successfully',
      ...successResponse,
    },
    409: {
      description: 'Phone number already exists',
      ...conflictResponse,
    },
    400: {
      description: 'Invalid request body',
      ...errorResponse,
    },
    500: {
      description: 'Internal server error',
      ...errorResponse,
    },
  },
};
