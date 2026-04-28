import { FastifySchema } from 'fastify';

const servicePackageItem = {
  type: 'object',
  properties: {
    bonus_percent: { type: 'number' },
    bonus_license_key_count: { type: 'number' },
    total_license_key_count: { type: 'number' },
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
    is_active: { type: 'boolean' },
  },
};

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number' },
    page_size: { type: 'number' },
    total: { type: 'number' },
    total_pages: { type: 'number' },
  },
};

const purchaseItem = {
  type: 'object',
  properties: {
    purchase_id: { type: 'string', format: 'uuid' },
    service_package_id: { type: 'string', format: 'uuid' },
    product_code: { type: 'string' },
    type: { type: 'string', enum: ['personal', 'enterprise'] },
    status: { type: 'string', enum: ['processing', 'completed', 'failed'] },
    channel: { type: 'string', enum: ['direct', 'agency'] },
    seller_user_id: { type: ['string', 'null'] },
    license_key_count: { type: 'number' },
    unit_price_usd: { type: 'string' },
    total_price_usd: { type: 'string' },
    purchased_at: { type: 'string' },
    core_note_ref: { type: ['string', 'null'] },
    package: {
      type: 'object',
      properties: {
        price_per_month: { type: 'string' },
        facebook_personal_limit: { type: 'number' },
        facebook_fanpage_limit: { type: 'number' },
        zalo_limit: { type: 'number' },
        tiktok_limit: { type: 'number' },
        telegram_limit: { type: 'number' },
        bonus: { type: ['string', 'null'] },
        community_support: { type: 'boolean' },
        support_24_7: { type: 'boolean' },
        is_popular: { type: 'boolean' },
      },
    },
  },
};

const licenseKeyItem = {
  type: 'object',
  properties: {
    core_license_key_id: { type: 'string', format: 'uuid' },
    purchase_id: { type: ['string', 'null'] },
    license_key: { type: 'string' },
    status: { type: 'string', enum: ['unused', 'used', 'expired'] },
    expires_at: { type: ['string', 'null'] },
    activated_at: { type: ['string', 'null'] },
    used_by_portal_id: { type: ['string', 'null'] },
    seller_user_id: { type: ['string', 'null'] },
    channel: { type: 'string', enum: ['direct', 'agency'] },
    purchased_at: { type: 'string' },
    service_package: {
      type: ['object', 'null'],
      properties: {
        service_package_id: { type: 'string', format: 'uuid' },
        product_code: { type: 'string' },
        type: { type: 'string', enum: ['personal', 'enterprise'] },
        license_key_count: { type: 'number' },
        price_per_month: { type: 'string' },
        facebook_personal_limit: { type: 'number' },
        facebook_fanpage_limit: { type: 'number' },
        zalo_limit: { type: 'number' },
        tiktok_limit: { type: 'number' },
        telegram_limit: { type: 'number' },
      },
    },
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
      include_inactive: {
        type: 'boolean',
        description: 'Include inactive packages for admin management view',
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

const servicePackageMutationBody = {
  type: 'object',
  properties: {
    product_code: { type: 'string', minLength: 1 },
    price_per_month: { type: 'number', minimum: 0 },
    license_key_count: { type: 'integer', minimum: 0 },
    facebook_personal_limit: { type: 'integer', minimum: 0 },
    facebook_fanpage_limit: { type: 'integer', minimum: 0 },
    zalo_limit: { type: 'integer', minimum: 0 },
    tiktok_limit: { type: 'integer', minimum: 0 },
    telegram_limit: { type: 'integer', minimum: 0 },
    bonus: { type: ['string', 'null'] },
    agent_discount_percent: { type: 'integer', minimum: 0, maximum: 100 },
    community_support: { type: 'boolean' },
    support_24_7: { type: 'boolean' },
    type: { type: 'string', enum: ['personal', 'enterprise'] },
    is_popular: { type: 'boolean' },
    sort_order: { type: 'integer', minimum: 0 },
    is_active: { type: 'boolean' },
  },
};

export const createServicePackageSchema: FastifySchema = {
  tags: ['Service Packages'],
  summary: 'Create service package',
  security: [{ bearerAuth: [] }],
  body: {
    ...servicePackageMutationBody,
    required: [
      'product_code',
      'price_per_month',
      'license_key_count',
      'facebook_personal_limit',
      'facebook_fanpage_limit',
      'zalo_limit',
      'tiktok_limit',
      'telegram_limit',
      'agent_discount_percent',
      'community_support',
      'support_24_7',
      'type',
      'is_popular',
      'sort_order',
    ],
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: servicePackageItem,
      },
    },
  },
};

export const updateServicePackageSchema: FastifySchema = {
  tags: ['Service Packages'],
  summary: 'Update service package',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['servicePackageId'],
    properties: {
      servicePackageId: { type: 'string', format: 'uuid' },
    },
  },
  body: servicePackageMutationBody,
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: servicePackageItem,
      },
    },
  },
};

export const deleteServicePackageSchema: FastifySchema = {
  tags: ['Service Packages'],
  summary: 'Delete service package',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['servicePackageId'],
    properties: {
      servicePackageId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            archived: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const purchaseServicePackageSchema: FastifySchema = {
  tags: ['Service Packages'],
  summary: 'Mua gói dịch vụ',
  description:
    'Trừ số dư credit (1 USD = 10 credit), gọi svc-core-api phát hành license key, rồi lưu lịch sử mua gói.',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['service_package_id'],
    properties: {
      service_package_id: { type: 'string', format: 'uuid' },
      seller_user_id: { type: ['string', 'null'] },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            purchase_id: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            channel: { type: 'string' },
            seller_user_id: { type: ['string', 'null'] },
            service_package_id: { type: 'string', format: 'uuid' },
            product_code: { type: 'string' },
            license_key_count: { type: 'number' },
            base_license_key_count: { type: 'number' },
            bonus_license_key_count: { type: 'number' },
            bonus_percent: { type: 'number' },
            total_price_usd: { type: 'string' },
            total_price_credits: { type: 'string' },
            purchased_at: { type: 'string' },
            expires_at: { type: 'string' },
            remaining_credits: { type: 'string' },
          },
        },
      },
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    401: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    502: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const listServicePackagePurchasesSchema: FastifySchema = {
  tags: ['Service Packages'],
  summary: 'Lịch sử mua gói dịch vụ',
  description: 'Lấy lịch sử mua gói của người dùng hiện tại.',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number' },
      page_size: { type: 'number' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: purchaseItem,
        },
        pagination: paginationSchema,
      },
    },
  },
};

export const listPurchasedLicenseKeysSchema: FastifySchema = {
  tags: ['Service Packages'],
  summary: 'Danh sách license key đã mua',
  description:
    'Lấy license key của người dùng hiện tại từ svc-core-api và enrich bằng dữ liệu gói ở CRM.',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number' },
      page_size: { type: 'number' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: licenseKeyItem,
        },
        pagination: paginationSchema,
      },
    },
  },
};
