import type { FastifySchema } from 'fastify';

export const adminLoginSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Admin Login',
  description:
    'Đăng nhập dành cho quản trị viên hệ thống. ' +
    'Xác thực số điện thoại qua svc-core-api (is_admin=true), ' +
    'tự động tạo/cập nhật tài khoản trong biztada-crm với role=null (full access), ' +
    'xác thực mật khẩu bcrypt, và trả về JWT access token + refresh token.',
  body: {
    type: 'object',
    required: ['phoneNumber', 'password'],
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Số điện thoại đăng ký (E.164 hoặc định dạng VN: 0912..., +84912...)',
        examples: ['+84912345678', '0912345678'],
      },
      password: {
        type: 'string',
        minLength: 6,
        description: 'Mật khẩu admin',
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
      description: 'Không có quyền admin, tài khoản bị khóa, hoặc chưa đặt mật khẩu',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string', description: 'PASSWORD_NOT_SET nếu chưa đặt mật khẩu' },
        message: { type: 'string' },
      },
    },
    401: {
      description: 'Sai mật khẩu',
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

export const adminInitPasswordSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Đặt mật khẩu lần đầu (Admin)',
  description:
    'Cho phép admin đặt mật khẩu lần đầu. ' +
    'Chỉ hoạt động khi tài khoản chưa có mật khẩu. ' +
    'Số điện thoại phải có is_admin=true trong svc-core-api.',
  body: {
    type: 'object',
    required: ['phoneNumber', 'password'],
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Số điện thoại admin',
      },
      password: {
        type: 'string',
        minLength: 6,
        description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    403: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    409: {
      description: 'Mật khẩu đã được đặt rồi',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
