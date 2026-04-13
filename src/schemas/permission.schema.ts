import { FastifySchema } from 'fastify';

const nameProperty = {
  type: 'string',
  minLength: 3,
  maxLength: 100,
  errorMessage: {
    type: 'Tên quyền hạn phải là một chuỗi (string).',
    minLength: 'Tên quyền hạn quá ngắn (tối thiểu 3 ký tự).',
    maxLength: 'Tên quyền hạn quá dài (tối đa 100 ký tự).',
  },
};

const codeProperty = {
  type: 'string',
  pattern: '^[a-z0-9:_-]+$',
  minLength: 3,
  maxLength: 50,
  errorMessage: {
    type: 'Mã quyền hạn phải là một chuỗi (string).',
    pattern: 'Mã quyền hạn chỉ được chứa chữ thường, số, dấu hai chấm, gạch dưới và gạch ngang.',
    minLength: 'Mã quyền hạn quá ngắn (tối thiểu 3 ký tự).',
    maxLength: 'Mã quyền hạn quá dài (tối đa 50 ký tự).',
  },
};

const permissionDataResponse = {
  type: 'object',
  properties: {
    permission_id: { type: 'string' },
    name: { type: 'string' },
    code: { type: 'string' },
    created_at: { type: 'string' },
  },
};

const successResponse = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    message: { type: 'string' },
    data: permissionDataResponse,
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

export const addPermissionSchema: FastifySchema = {
  tags: ['Permissions'],
  description: 'Add a new permission to the system with unique code',
  summary: 'Add Permission',
  body: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      name: nameProperty,
      code: codeProperty,
    },
  },
  response: {
    201: {
      description: 'Permission created successfully',
      ...successResponse,
    },
    409: {
      description: 'Permission code already exists',
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
