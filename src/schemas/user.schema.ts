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
    parent_user_id: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    deleted_at: { type: ['string', 'null'] },
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

export const getUsersSchema: FastifySchema = {
  tags: ['Users'],
  description: 'Retrieve users with pagination, search, and filters',
  summary: 'Get Users (Paginated)',
  querystring: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 10,
        description: 'Number of users per page',
      },
      offset: {
        type: 'integer',
        minimum: 0,
        default: 0,
        description: 'Number of users to skip',
      },
      search: {
        type: 'string',
        description: 'Search by phone number or agency name',
      },
      role: {
        type: 'string',
        enum: ['mod', 'agency', 'user', 'customer'],
        description: 'Filter by role',
      },
      status: {
        type: 'string',
        enum: ['active', 'disabled', 'deleted'],
        description: 'Filter by status (use deleted to view soft-deleted users)',
      },
      all: {
        type: 'boolean',
        description: 'Return all users without pagination',
      },
      parent_user_id: {
        type: 'string',
        description: 'Filter by parent user ID',
      },
    },
  },
  response: {
    200: {
      description: 'Users retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: userDataResponse,
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            all: { type: 'boolean' },
          },
        },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      ...errorResponse,
    },
  },
};

export const getUserByIdSchema: FastifySchema = {
  tags: ['Users'],
  description: 'Retrieve a user by ID',
  summary: 'Get User by ID',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
  response: {
    200: {
      description: 'User retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: userDataResponse,
        message: { type: 'string' },
      },
    },
    404: {
      description: 'User not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      ...errorResponse,
    },
  },
};

export const updateUserSchema: FastifySchema = {
  tags: ['Users'],
  description: 'Update user information',
  summary: 'Update User',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      agency_name: agencyNameProperty,
      role: roleProperty,
      status: statusProperty,
      parent_user_id: parentUserIdProperty,
      restore: {
        type: 'boolean',
        description: 'Set to true to restore a soft-deleted user',
      },
    },
  },
  response: {
    200: {
      description: 'User updated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: userDataResponse,
        message: { type: 'string' },
      },
    },
    404: {
      description: 'User not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
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

export const deleteUserSchema: FastifySchema = {
  tags: ['Users'],
  description: 'Delete a user (soft delete)',
  summary: 'Delete User',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
  response: {
    200: {
      description: 'User deleted successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: userDataResponse,
        message: { type: 'string' },
      },
    },
    404: {
      description: 'User not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      ...errorResponse,
    },
  },
};
