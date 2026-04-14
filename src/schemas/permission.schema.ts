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

export const checkPermissionSchema: FastifySchema = {
  description: 'Check if user has a specific permission',
  tags: ['Permission Check'],
  summary: 'Check Single Permission',
  body: {
    type: 'object',
    required: ['user_id', 'permission_code'],
    properties: {
      user_id: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
      },
      permission_code: {
        type: 'string',
        description: 'Permission code (e.g., "worker:assign")',
      },
    },
  },
  response: {
    200: {
      description: 'Permission check result',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            permission_code: { type: 'string' },
            has_permission: { type: 'boolean' },
          },
        },
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
  },
};

export const checkAllPermissionsSchema: FastifySchema = {
  description: 'Check if user has all specified permissions',
  tags: ['Permission Check'],
  summary: 'Check All Permissions',
  body: {
    type: 'object',
    required: ['user_id', 'permission_codes'],
    properties: {
      user_id: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
      },
      permission_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of permission codes',
      },
    },
  },
  response: {
    200: {
      description: 'Permission check result',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            permission_codes: { type: 'array', items: { type: 'string' } },
            has_all_permissions: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const checkAnyPermissionSchema: FastifySchema = {
  description: 'Check if user has at least one of the specified permissions',
  tags: ['Permission Check'],
  summary: 'Check Any Permission',
  body: {
    type: 'object',
    required: ['user_id', 'permission_codes'],
    properties: {
      user_id: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
      },
      permission_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of permission codes',
      },
    },
  },
  response: {
    200: {
      description: 'Permission check result',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            permission_codes: { type: 'array', items: { type: 'string' } },
            has_any_permission: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const getUserPermissionsSchema: FastifySchema = {
  description: 'Get all effective permissions for a user',
  tags: ['User Permissions'],
  summary: 'Get User Permissions',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
      },
    },
  },
  response: {
    200: {
      description: 'User permissions list',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            phone_number: { type: 'string' },
            role: { type: 'string' },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  permission_id: { type: 'string' },
                  code: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
            overrides: {
              type: 'object',
              properties: {
                allow: { type: 'array', items: { type: 'string' } },
                deny: { type: 'array', items: { type: 'string' } },
              },
            },
            total: { type: 'integer' },
          },
        },
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
  },
};

export const addUserPermissionOverrideSchema: FastifySchema = {
  description: 'Add a permission override for a user',
  tags: ['User Permissions'],
  summary: 'Add Permission Override',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['permission_code', 'permission_type'],
    properties: {
      permission_code: {
        type: 'string',
        description: 'Permission code',
      },
      permission_type: {
        type: 'string',
        enum: ['allow', 'deny'],
        description: 'Type of permission override (allow to grant, deny to revoke)',
      },
    },
  },
  response: {
    201: {
      description: 'Permission override added successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            permission_code: { type: 'string' },
            permission_type: { type: 'string' },
            allow_codes: { type: 'array', items: { type: 'string' } },
            deny_codes: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};

export const removeUserPermissionOverrideSchema: FastifySchema = {
  description: 'Remove a permission override for a user',
  tags: ['User Permissions'],
  summary: 'Remove Permission Override',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['permission_code'],
    properties: {
      permission_code: {
        type: 'string',
        description: 'Permission code to remove',
      },
    },
  },
  response: {
    200: {
      description: 'Permission override removed successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            permission_code: { type: 'string' },
          },
        },
      },
    },
  },
};

export const getPermissionsSchema: FastifySchema = {
  tags: ['Permissions'],
  description: 'Retrieve permissions list with pagination and optional search',
  summary: 'Get Permissions',
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      search: { type: 'string', description: 'Search by name or code' },
    },
  },
  response: {
    200: {
      description: 'Permissions retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: permissionDataResponse,
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

export const updatePermissionSchema: FastifySchema = {
  tags: ['Permissions'],
  description: 'Update an existing permission name or code',
  summary: 'Update Permission',
  params: {
    type: 'object',
    required: ['permissionId'],
    properties: {
      permissionId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: nameProperty,
      code: codeProperty,
    },
  },
  response: {
    200: {
      description: 'Permission updated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: permissionDataResponse,
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Permission not found',
      type: 'object',
      properties: { success: { type: 'boolean' }, message: { type: 'string' } },
    },
    409: {
      description: 'Permission code already exists',
      ...conflictResponse,
    },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

export const deletePermissionSchema: FastifySchema = {
  tags: ['Permissions'],
  description: 'Soft delete a permission',
  summary: 'Delete Permission',
  params: {
    type: 'object',
    required: ['permissionId'],
    properties: {
      permissionId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      description: 'Permission deleted successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            permission_id: { type: 'string' },
            name: { type: 'string' },
            code: { type: 'string' },
            deleted_at: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Permission not found',
      type: 'object',
      properties: { success: { type: 'boolean' }, message: { type: 'string' } },
    },
    500: { description: 'Internal server error', ...errorResponse },
  },
};

export const setUserPermissionOverridesSchema: FastifySchema = {
  tags: ['Permissions'],
  description: 'Set bulk permission overrides for a user',
  summary: 'Set User Permission Overrides',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      allow_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of permission codes to allow',
      },
      deny_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of permission codes to deny',
      },
    },
  },
  response: {
    200: {
      description: 'Permissions updated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            allow_codes: { type: 'array', items: { type: 'string' } },
            deny_codes: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    400: {
      description: 'Invalid input',
      ...errorResponse,
    },
    404: {
      description: 'User not found',
      type: 'object',
      properties: { success: { type: 'boolean' }, message: { type: 'string' } },
    },
    500: { description: 'Internal server error', ...errorResponse },
  },
};
