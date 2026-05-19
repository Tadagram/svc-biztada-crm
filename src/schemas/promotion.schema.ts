import { FastifySchema } from 'fastify';

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

// ─── GET /promotions/settings ─────────────────────────────────────────────────

export const getPromotionSettingsSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'Get new-user bonus credit settings',
  response: {
    200: {
      type: 'object',
      properties: {
        new_user_bonus_credits: { type: 'number' },
        updated_at: { type: 'string', nullable: true },
      },
    },
    500: errorResponse,
  },
};

// ─── PUT /promotions/settings ─────────────────────────────────────────────────

export const updatePromotionSettingsSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'Update new-user bonus credit settings (mod only)',
  body: {
    type: 'object',
    required: ['new_user_bonus_credits'],
    properties: {
      new_user_bonus_credits: { type: 'number', minimum: 0 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        new_user_bonus_credits: { type: 'number' },
        updated_at: { type: 'string' },
      },
    },
    400: errorResponse,
    500: errorResponse,
  },
};

// ─── GET /promotions/eligible-users ───────────────────────────────────────────

export const listEligibleUsersSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'List users filterable by total purchase spend',
  querystring: {
    type: 'object',
    properties: {
      min_spend: { type: 'string' },
      max_spend: { type: 'string' },
      limit: { type: 'string' },
      offset: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
    500: errorResponse,
  },
};

// ─── GET /promotions ──────────────────────────────────────────────────────────

export const listPromotionsSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'List event promotions',
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['draft', 'executed', 'cancelled'] },
      limit: { type: 'string' },
      offset: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
    500: errorResponse,
  },
};

// ─── POST /promotions ─────────────────────────────────────────────────────────

export const createPromotionSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'Create a new event promotion (draft)',
  body: {
    type: 'object',
    required: ['name', 'message', 'credit_amount', 'target_type'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      message: { type: 'string', minLength: 1 },
      credit_amount: { type: 'number', minimum: 0.01 },
      target_type: { type: 'string', enum: ['all', 'custom'] },
      user_ids: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponse,
    500: errorResponse,
  },
};

// ─── GET /promotions/:promotionId ──────────────────────────────────────────────

export const getPromotionSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'Get a promotion by ID',
  params: {
    type: 'object',
    required: ['promotionId'],
    properties: { promotionId: { type: 'string' } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: { type: 'object', additionalProperties: true },
      },
    },
    404: errorResponse,
    500: errorResponse,
  },
};

// ─── PUT /promotions/:promotionId ──────────────────────────────────────────────

export const updatePromotionSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'Update a draft promotion',
  params: {
    type: 'object',
    required: ['promotionId'],
    properties: { promotionId: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      message: { type: 'string', minLength: 1 },
      credit_amount: { type: 'number', minimum: 0.01 },
      target_type: { type: 'string', enum: ['all', 'custom'] },
      user_ids: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    400: errorResponse,
    404: errorResponse,
    409: errorResponse,
    500: errorResponse,
  },
};

// ─── DELETE /promotions/:promotionId ──────────────────────────────────────────

export const deletePromotionSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'Delete a draft promotion',
  params: {
    type: 'object',
    required: ['promotionId'],
    properties: { promotionId: { type: 'string' } },
  },
  response: {
    200: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
    404: errorResponse,
    409: errorResponse,
    500: errorResponse,
  },
};

// ─── POST /promotions/:promotionId/execute ─────────────────────────────────────

export const executePromotionSchema: FastifySchema = {
  tags: ['Promotions'],
  summary: 'Execute a draft promotion — credits users and sends notifications',
  params: {
    type: 'object',
    required: ['promotionId'],
    properties: { promotionId: { type: 'string' } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        credited_count: { type: 'number' },
      },
    },
    404: errorResponse,
    409: errorResponse,
    500: errorResponse,
  },
};
