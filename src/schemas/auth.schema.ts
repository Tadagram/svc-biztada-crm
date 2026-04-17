import type { FastifySchema } from 'fastify';

export const adminLoginSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Admin Login',
  description:
    'Dang nhap danh cho quan tri vien he thong. ' +
    'Xac thuc so dien thoai qua svc-core-api (is_admin=true), ' +
    'xac thuc mat khau bcrypt, va tra ve JWT access token + refresh token.',
  body: {
    type: 'object',
    required: ['phoneNumber', 'password'],
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'So dien thoai dang ky (E.164 hoac dinh dang VN: 0912..., +84912...)',
        examples: ['+84912345678', '0912345678'],
      },
      password: {
        type: 'string',
        minLength: 6,
        description: 'Mat khau admin',
      },
    },
  },
  response: {
    200: {
      description: 'Dang nhap thanh cong',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        token: { type: 'string', description: 'JWT access token (1h)' },
        refreshToken: { type: 'string', description: 'Refresh token (7 ngay)' },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            role: { type: ['string', 'null'] },
            phoneNumber: { type: 'string' },
          },
        },
      },
    },
    401: {
      description: 'Sai mat khau',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    403: {
      description: 'Khong co quyen admin, tai khoan bi khoa, hoac chua duoc cap mat khau',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string', description: 'NOT_PROVISIONED neu chua duoc cap mat khau' },
        message: { type: 'string' },
      },
    },
    503: {
      description: 'Khong the ket noi svc-core-api',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const adminProvisionSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Provision Admin Account (Super-admin only)',
  description:
    'Super-admin endpoint: verify phone is_admin in svc-core-api, ' +
    'auto-generate a random 12-char password, store bcrypt hash, ' +
    'return plaintext password once for distribution to the admin. ' +
    'Calling again force-resets the password. ' +
    'Requires header: X-Super-Admin-Secret matching SUPER_ADMIN_SECRET env var.',
  headers: {
    type: 'object',
    required: ['x-super-admin-secret'],
    properties: {
      'x-super-admin-secret': { type: 'string', description: 'Super-admin provisioning secret' },
    },
  },
  body: {
    type: 'object',
    required: ['phoneNumber'],
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Admin phone number to provision',
        examples: ['+84912345678', '0912345678'],
      },
    },
  },
  response: {
    200: {
      description: 'Provisioned successfully - returns one-time plaintext password',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        phoneNumber: { type: 'string' },
        password: { type: 'string', description: 'Plaintext password - share with admin once' },
      },
    },
    403: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    503: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
