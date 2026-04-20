import { FastifySchema } from 'fastify';

// ─── Shared response shapes ────────────────────────────────────────────────────

const topupStatusEnum = ['PENDING', 'APPROVED', 'REJECTED'] as const;

const topupDataResponse = {
  type: 'object',
  properties: {
    topup_id: { type: 'string' },
    user_id: { type: 'string' },
    amount: { type: 'string' }, // USDT amount (Decimal → string)
    currency: { type: 'string' },
    credit_amount: { type: 'string' },
    source_channel: { type: 'string', enum: ['DIRECT', 'WHITELABEL'] },
    sales_agency_uuid: { type: ['string', 'null'] },
    transfer_ref: { type: ['string', 'null'] },
    proof_note: { type: ['string', 'null'] },
    status: { type: 'string', enum: topupStatusEnum },
    submitted_at: { type: 'string' },
    reviewed_by: { type: ['string', 'null'] },
    reviewed_at: { type: ['string', 'null'] },
    review_note: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    user: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        phone_number: { type: 'string' },
        agency_name: { type: ['string', 'null'] },
        balance: { type: 'string' },
      },
    },
    reviewer: {
      type: ['object', 'null'],
      properties: {
        user_id: { type: 'string' },
        phone_number: { type: 'string' },
        agency_name: { type: ['string', 'null'] },
      },
    },
  },
};

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

const creditBalanceDataResponse = {
  type: 'object',
  properties: {
    user_id: { type: 'string' },
    available_credits: { type: 'string' },
    updated_at: { type: ['string', 'null'] },
  },
};

const creditLedgerDataResponse = {
  type: 'object',
  properties: {
    credit_entry_id: { type: 'string' },
    user_id: { type: 'string' },
    topup_id: { type: ['string', 'null'] },
    entry_type: { type: 'string' },
    direction: { type: 'string' },
    amount: { type: 'string' },
    balance_after: { type: 'string' },
    purpose: { type: ['string', 'null'] },
    source_channel: { type: 'string', enum: ['DIRECT', 'WHITELABEL'] },
    sales_agency_uuid: { type: ['string', 'null'] },
    metadata: { type: ['object', 'null'] },
    created_by: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    user: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        phone_number: { type: 'string' },
        agency_name: { type: ['string', 'null'] },
      },
    },
    topup: {
      type: ['object', 'null'],
      properties: {
        topup_id: { type: 'string' },
        amount: { type: 'string' },
        currency: { type: 'string' },
        credit_amount: { type: 'string' },
        source_channel: { type: 'string', enum: ['DIRECT', 'WHITELABEL'] },
        sales_agency_uuid: { type: ['string', 'null'] },
        status: { type: 'string', enum: topupStatusEnum },
      },
    },
  },
};

// ─── POST /topup/submit ────────────────────────────────────────────────────────

export const submitTopUpSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Gửi yêu cầu nạp tiền',
  description: 'Khách hàng gửi yêu cầu nạp tiền với user_uuid, số tiền, và UUID đại lý (nếu có).',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['user_uuid', 'amount'],
    properties: {
      user_uuid: {
        type: 'string',
        format: 'uuid',
        description: 'UUID của user nạp tiền',
      },
      amount: {
        type: 'number',
        minimum: 1,
        description:
          'Số tiền muốn nạp (USDT, tối thiểu 1 USDT). Tỷ lệ quy đổi: 1 USDT = 10 credits.',
      },
      currency: {
        anyOf: [{ type: 'string', enum: ['VND', 'USDT'] }, { type: 'null' }],
        description: 'Loại tiền tệ nạp: VND hoặc USDT (mặc định USDT)',
      },
      seller_agency_uuid: {
        anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }],
        description: 'UUID đại lý bán hàng (nếu có, null nếu không)',
      },
      transfer_ref: {
        anyOf: [{ type: 'string', minLength: 1, maxLength: 64 }, { type: 'null' }],
        description: 'Mã nội dung chuyển khoản do khách nhập vào phần nội dung (VD: TXN06IKVW5)',
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: topupDataResponse,
      },
    },
    400: errorResponse,
    401: errorResponse,
  },
};

// ─── GET /topup (reviewer list) ────────────────────────────────────────────────

export const listTopUpsSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Danh sách yêu cầu nạp tiền (Reviewer)',
  description: 'Reviewer xem tất cả yêu cầu, có thể lọc theo status, user, ngày.',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: topupStatusEnum },
      user_id: { type: 'string', description: 'Lọc theo user cụ thể' },
      source_channel: {
        type: 'string',
        enum: ['DIRECT', 'WHITELABEL'],
        description: 'Lọc theo nguồn nạp',
      },
      sales_agency_uuid: {
        type: 'string',
        description: 'Lọc theo UUID đại lý bán hàng',
      },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      before: {
        type: 'string',
        description: 'Cursor: ISO timestamp của submitted_at của item cuối trang trước',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: topupDataResponse },
        cursor: {
          type: 'object',
          properties: {
            nextCursor: { type: ['string', 'null'] },
            hasMore: { type: 'boolean' },
            limit: { type: 'integer' },
          },
        },
      },
    },
    401: errorResponse,
    403: errorResponse,
  },
};

// ─── GET /topup/me ────────────────────────────────────────────────────────────

export const myTopUpsSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Lịch sử nạp tiền của tôi',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: topupStatusEnum },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      before: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: topupDataResponse },
        cursor: {
          type: 'object',
          properties: {
            nextCursor: { type: ['string', 'null'] },
            hasMore: { type: 'boolean' },
            limit: { type: 'integer' },
          },
        },
      },
    },
    401: errorResponse,
  },
};

// ─── GET /topup/:topupId ──────────────────────────────────────────────────────

export const getTopUpSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Chi tiết một yêu cầu nạp tiền',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['topupId'],
    properties: {
      topupId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: topupDataResponse,
      },
    },
    404: errorResponse,
    403: errorResponse,
  },
};

// ─── POST /topup/:topupId/approve ─────────────────────────────────────────────

export const approveTopUpSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Duyệt yêu cầu nạp tiền → cộng balance',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['topupId'],
    properties: {
      topupId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      review_note: { type: 'string', maxLength: 300 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: topupDataResponse,
        new_balance: { type: 'string' },
        new_credit_balance: { type: 'string' },
      },
    },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
};

// ─── POST /topup/:topupId/reject ──────────────────────────────────────────────

export const rejectTopUpSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Từ chối yêu cầu nạp tiền',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['topupId'],
    properties: {
      topupId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      review_note: { type: 'string', maxLength: 300 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: topupDataResponse,
      },
    },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
};

// ─── GET /topup/stream (SSE) ──────────────────────────────────────────────────

export const streamTopUpSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'SSE stream — nhận sự kiện nạp tiền realtime (Reviewer)',
  description:
    'Kết nối SSE để nhận thông báo ngay khi có yêu cầu nạp mới hoặc khi có cập nhật trạng thái. ' +
    'Sự kiện được gửi dưới dạng `data: {...}\\n\\n`.',
  security: [{ bearerAuth: [] }],
  response: {
    200: { type: 'string', description: 'text/event-stream' },
    401: errorResponse,
    403: errorResponse,
  },
};

// ─── GET /topup/credits/balance ──────────────────────────────────────────────

export const getCreditBalanceSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Lấy số dư credit hiện tại của người dùng',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: creditBalanceDataResponse,
      },
    },
    401: errorResponse,
  },
};

// ─── GET /topup/credits/ledger ───────────────────────────────────────────────

export const listCreditLedgerSchema: FastifySchema = {
  tags: ['TopUp'],
  summary: 'Lấy lịch sử biến động credit',
  description:
    'User thường xem lịch sử credit của chính mình. Reviewer có quyền topup:review có thể lọc theo user bất kỳ.',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      user_id: { type: 'string' },
      entry_type: { type: 'string', enum: ['TOPUP_APPROVED', 'USAGE', 'ADJUSTMENT', 'REFUND'] },
      direction: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
      source_channel: { type: 'string', enum: ['DIRECT', 'WHITELABEL'] },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      before: {
        type: 'string',
        description: 'Cursor: ISO timestamp của created_at của item cuối trang trước',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: creditLedgerDataResponse },
        cursor: {
          type: 'object',
          properties: {
            nextCursor: { type: ['string', 'null'] },
            hasMore: { type: 'boolean' },
            limit: { type: 'integer' },
          },
        },
      },
    },
    401: errorResponse,
  },
};
