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
    role: { type: ['string', 'null'] },
    status: { type: 'string' },
    parent_user_id: { type: ['string', 'null'] },
    available_credits: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    deleted_at: { type: ['string', 'null'] },
    // svc-core-api enriched fields (biztada users)
    telegram_id: { type: ['number', 'null'] },
    first_name: { type: ['string', 'null'] },
    last_name: { type: ['string', 'null'] },
    username: { type: ['string', 'null'] },
    is_premium: { type: 'boolean' },
    business_count: { type: 'integer' },
    portal_count: { type: 'integer' },
    worker_count: { type: 'integer' },
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
      lifecycle: {
        type: 'string',
        enum: ['active', 'new', 'dormant'],
        description: 'Filter by lifecycle stage (for customers)',
      },
    },
  },
  response: {
    200: {
      description: 'Users retrieved successfully',
      type: 'object',
      properties: {
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
            pages: { type: 'integer' },
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

export const getUserSummarySchema: FastifySchema = {
  tags: ['Users'],
  summary: 'Get User Summary',
  description:
    'Returns engagement summary for a user: assigned worker count, usage sessions, hours used, and last activity.',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', format: 'uuid' },
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
            worker_count: { type: 'integer' },
            active_sessions: { type: 'integer' },
            total_sessions: { type: 'integer' },
            total_hours: { type: 'number' },
            last_used_at: { type: ['string', 'null'] },
            assigned_workers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  worker_id: { type: 'string' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                  assignment_status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getUserInsightSchema: FastifySchema = {
  tags: ['Users'],
  summary: 'Get User Insight',
  description:
    'Returns full insight for a user including license usage, package purchase history, topup/payment totals, and portal-worker mappings.',
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', format: 'uuid' },
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
            user: userDataResponse,
            financial_summary: {
              type: 'object',
              properties: {
                approved_topups_count: { type: 'integer' },
                total_topup_amount_usd: { type: 'number' },
                total_topup_credits: { type: 'number' },
                completed_purchases_count: { type: 'integer' },
                total_purchase_amount_usd: { type: 'number' },
              },
            },
            licenses: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                active: { type: 'integer' },
                unused: { type: 'integer' },
                expired: { type: 'integer' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key_id: { type: 'string' },
                      license_key: { type: 'string' },
                      status: { type: 'string' },
                      expires_at: { type: ['string', 'null'] },
                      activated_at: { type: ['string', 'null'] },
                      used_by_portal_id: { type: ['string', 'null'] },
                      purchase_id: { type: ['string', 'null'] },
                      product_code: { type: ['string', 'null'] },
                      service_package_id: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            purchase_history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  purchase_id: { type: 'string' },
                  status: { type: 'string' },
                  channel: { type: 'string' },
                  seller_user_id: { type: ['string', 'null'] },
                  purchased_at: { type: 'string' },
                  total_price_usd: { type: 'number' },
                  unit_price_usd: { type: 'number' },
                  license_key_count: { type: 'integer' },
                  product_code: { type: 'string' },
                  service_package_id: { type: 'string' },
                },
              },
            },
            topup_history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topup_id: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  credit_amount: { type: 'number' },
                  source_channel: { type: 'string' },
                  sales_agency_uuid: { type: ['string', 'null'] },
                  submitted_at: { type: 'string' },
                  reviewed_at: { type: ['string', 'null'] },
                  review_note: { type: ['string', 'null'] },
                },
              },
            },
            credit_ledger: {
              type: 'object',
              properties: {
                available_credits: { type: 'number' },
                updated_at: { type: ['string', 'null'] },
                total_credit: { type: 'number' },
                total_debit: { type: 'number' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      credit_entry_id: { type: 'string' },
                      entry_type: { type: 'string' },
                      direction: { type: 'string' },
                      amount: { type: 'number' },
                      balance_after: { type: 'number' },
                      purpose: { type: ['string', 'null'] },
                      source_channel: { type: 'string' },
                      sales_agency_uuid: { type: ['string', 'null'] },
                      created_at: { type: 'string' },
                      topup: {
                        type: ['object', 'null'],
                        properties: {
                          topup_id: { type: 'string' },
                          status: { type: 'string' },
                          amount: { type: 'number' },
                          currency: { type: 'string' },
                          credit_amount: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
            portal_workers: {
              type: 'object',
              properties: {
                total_rows: { type: 'integer' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      portal_id: { type: 'string' },
                      device_name: { type: 'string' },
                      portal_type: { type: 'string' },
                      portal_status: { type: 'string' },
                      user_id: { type: 'string' },
                      worker_row_id: { type: ['string', 'null'] },
                      worker_uuid: { type: ['string', 'null'] },
                      worker_type: { type: ['string', 'null'] },
                      installed_at: { type: ['string', 'null'] },
                      last_seen_at: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const deleteUserSchema: FastifySchema = {
  tags: ['Users'],
  description: 'Delete a user (soft delete by default, hard delete with ?hard=true)',
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
  querystring: {
    type: 'object',
    properties: {
      hard: {
        type: 'string',
        description: 'Set true/1 to perform hard delete with cross-service purge',
      },
      dry_run: {
        type: 'string',
        description: 'Set true/1 to run pre-delete audit only (no delete)',
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
        purge_report: {
          type: 'object',
          properties: {
            allSucceeded: { type: 'boolean' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  service: { type: 'string' },
                  attempted: { type: 'boolean' },
                  success: { type: 'boolean' },
                  status: { type: ['number', 'null'] },
                  message: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
        audit_report: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            hard_delete_requested: { type: 'boolean' },
            local_crm: { type: 'object', additionalProperties: { type: 'number' } },
            core: {
              type: 'object',
              properties: {
                attempted: { type: 'boolean' },
                success: { type: 'boolean' },
                status: { type: ['number', 'null'] },
                message: { type: ['string', 'null'] },
                data: { type: ['object', 'null'], additionalProperties: true },
              },
            },
            guard: {
              type: 'object',
              properties: {
                blocked_by_shared_business: { type: 'boolean' },
                shared_businesses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      business_id: { type: 'string' },
                      other_members_count: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        dry_run: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    409: {
      description: 'Hard delete blocked by shared business guard',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        audit_report: { type: 'object', additionalProperties: true },
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

export const getUserStatsSchema: FastifySchema = {
  tags: ['Users'],
  summary: 'Get user stats (counts by role/status)',
  querystring: {
    type: 'object',
    properties: {
      role: { type: 'string' },
      status: { type: 'string' },
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
            total: { type: 'number' },
            active: { type: 'number' },
            agencies: { type: 'number' },
            mods: { type: 'number' },
          },
        },
      },
    },
  },
};

export const getCustomerStatsSchema: FastifySchema = {
  tags: ['Users'],
  summary: 'Get customer lifecycle stats',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            active: { type: 'number' },
            new: { type: 'number' },
            dormant: { type: 'number' },
          },
        },
      },
    },
  },
};
