import { FastifySchema } from 'fastify';

const notificationTypes = [
  'system_alert',
  'user_action',
  'worker_assigned',
  'worker_released',
  'permission_changed',
  'account_updated',
  'custom',
] as const;

const notificationDataResponse = {
  type: 'object',
  properties: {
    notification_id: { type: 'string' },
    recipient_id: { type: 'string' },
    sender_id: { type: ['string', 'null'] },
    type: { type: 'string', enum: notificationTypes },
    title: { type: 'string' },
    body: { type: 'string' },
    image_url: { type: ['string', 'null'] },
    action_url: { type: ['string', 'null'] },
    custom_fields: {},
    is_read: { type: 'boolean' },
    read_at: { type: ['string', 'null'] },
    expires_at: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    sender: {
      type: ['object', 'null'],
      properties: {
        user_id: { type: 'string' },
        agency_name: { type: ['string', 'null'] },
        phone_number: { type: 'string' },
      },
    },
  },
};

const cursorMeta = {
  type: 'object',
  properties: {
    nextCursor: { type: ['string', 'null'] },
    hasMore: { type: 'boolean' },
    limit: { type: 'integer' },
  },
};

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

export const getNotificationsSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Get my notifications (cursor-paginated)',
  description:
    'Returns a cursor-paginated list of notifications ordered by newest first. Pass `before` cursor to load older items.',
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', default: 10, minimum: 1, maximum: 50 },
      before: {
        type: 'string',
        description: 'ISO timestamp cursor — fetch notifications older than this',
      },
      type: { type: 'string', enum: notificationTypes },
      is_read: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: notificationDataResponse,
        },
        cursor: cursorMeta,
      },
    },
    401: errorResponse,
  },
};

export const getUnreadCountSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Get unread notification count',
  description: 'Returns the total count of unread notifications for the authenticated user',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        count: { type: 'integer' },
      },
    },
    401: errorResponse,
  },
};

export const markReadSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Mark notification as read',
  description: 'Mark a single notification as read. Only the recipient can mark it.',
  params: {
    type: 'object',
    required: ['notificationId'],
    properties: {
      notificationId: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: notificationDataResponse,
      },
    },
    404: errorResponse,
    403: errorResponse,
  },
};

export const markAllReadSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Mark all notifications as read',
  description: 'Mark all unread notifications of the current user as read',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        updatedCount: { type: 'integer' },
      },
    },
    401: errorResponse,
  },
};

export const createNotificationSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Create notification (MOD only)',
  description: 'Create a notification and send it to a specific user. Requires MOD role.',
  body: {
    type: 'object',
    required: ['recipient_id', 'type', 'title', 'body'],
    properties: {
      recipient_id: {
        type: 'string',
        format: 'uuid',
        description: 'User ID of the recipient',
      },
      type: {
        type: 'string',
        enum: notificationTypes,
        description: 'Notification type',
      },
      title: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Short title of the notification',
      },
      body: {
        type: 'string',
        minLength: 1,
        description: 'Detailed notification body',
      },
      image_url: {
        type: 'string',
        description: 'Optional image URL',
      },
      action_url: {
        type: 'string',
        description: 'Optional deep-link URL (frontend route)',
      },
      custom_fields: {
        type: 'object',
        description: 'Arbitrary key-value metadata depending on notification type',
        additionalProperties: true,
      },
      expires_at: {
        type: 'string',
        format: 'date-time',
        description: 'Optional expiry timestamp (ISO 8601)',
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: notificationDataResponse,
      },
    },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
};
