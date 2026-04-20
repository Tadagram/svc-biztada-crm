import { FastifySchema } from 'fastify';

const servicePackageItem = {
  type: 'object',
  properties: {
    service_package_id: { type: 'string', format: 'uuid' },
    product_code: { type: 'string' },
    price_per_month: { type: 'string' },
    license_key_count: { type: 'number' },
    facebook_personal_limit: { type: 'number' },
    facebook_fanpage_limit: { type: 'number' },
    zalo_limit: { type: 'number' },
    tiktok_limit: { type: 'number' },
    telegram_limit: { type: 'number' },
    bonus: { type: ['string', 'null'] },
    agent_discount_percent: { type: 'number' },
    community_support: { type: 'boolean' },
    support_24_7: { type: 'boolean' },
    type: { type: 'string', enum: ['personal', 'enterprise'] },
    is_popular: { type: 'boolean' },
    sort_order: { type: 'number' },
  },
};

export const listServicePackagesSchema: FastifySchema = {
  tags: ['Service Packages'],
  summary: 'Danh sách gói dịch vụ',
  description:
    'Lấy danh sách gói dịch vụ theo type personal/enterprise để hiển thị ở app Subscription.',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['personal', 'enterprise'],
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: servicePackageItem,
        },
      },
    },
    401: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
