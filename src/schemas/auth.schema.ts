import type { FastifySchema } from 'fastify';

export const adminTelegramLoginSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Admin Telegram Login',
  description:
    'Xac thuc admin qua Telegram Login Widget. ' +
    'Body la du lieu tra ve tu widget (id, first_name, auth_date, hash...). ' +
    'Backend verify HMAC hash bang TELEGRAM_BOT_TOKEN, kiem tra is_admin trong svc-core-api.',
  body: {
    type: 'object',
    required: ['id', 'first_name', 'auth_date', 'hash'],
    properties: {
      id: { type: 'number', description: 'Telegram user ID' },
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      username: { type: 'string' },
      photo_url: { type: 'string' },
      auth_date: { type: 'number', description: 'Unix timestamp cua xac thuc' },
      hash: { type: 'string', description: 'HMAC-SHA256 hash tu Telegram' },
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
            telegramId: { type: 'number' },
            firstName: { type: 'string' },
            lastName: { type: ['string', 'null'] },
            username: { type: ['string', 'null'] },
            photoUrl: { type: ['string', 'null'] },
          },
        },
      },
    },
    401: {
      description: 'Hash khong hop le hoac het han',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    403: {
      description: 'Khong co quyen admin',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
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
