import type { FastifySchema } from 'fastify';

export const adminLoginSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Admin Login',
  description:
    'Đăng nhập dành cho quản trị viên hệ thống. ' +
    'Xác thực số điện thoại qua svc-core-api (is_admin=true), ' +
    'tự động tạo/cập nhật tài khoản trong biztada-crm với role=null (full access), ' +
    'và trả về JWT access token + refresh token.',
  body: {
    type: 'object',
    required: ['phoneNumber'],
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Số điện thoại đăng ký (E.164 hoặc định dạng VN: 0912..., +84912...)',
        examples: ['+84912345678', '0912345678'],
      },
    },
  },
  response: {
    200: {
      description: 'Đăng nhập thành công',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        token: { type: 'string', description: 'JWT access token (1h)' },
        refreshToken: { type: 'string', description: 'Refresh token (7 ngày)' },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            role: { type: ['string', 'null'], description: 'null = full admin access' },
            phoneNumber: { type: 'string' },
          },
        },
      },
    },
    403: {
      description: 'Không có quyền admin hoặc tài khoản bị khóa',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    404: {
      description: 'Số điện thoại chưa đăng ký',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    503: {
      description: 'Không thể kết nối svc-core-api',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
