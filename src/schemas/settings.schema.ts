import { FastifySchema } from 'fastify';

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

// ─── GET /settings/qr-code ────────────────────────────────────────────────────

export const getQRCodeSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Get QR code for top-up payment',
  description:
    'Returns the current QR code image (as base64 data URL). Public endpoint — no auth required.',
  response: {
    200: {
      type: 'object',
      properties: {
        configured: { type: 'boolean' },
        imageDataUrl: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    500: errorResponse,
  },
};

// ─── POST /settings/qr-code ───────────────────────────────────────────────────

export const uploadQRCodeSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Upload / replace QR code (mod only)',
  description:
    'Upload a new QR code image as base64 data URL. Replaces the existing one. Stored in database — survives deploys.',
  body: {
    type: 'object',
    required: ['imageDataUrl'],
    properties: {
      imageDataUrl: {
        type: 'string',
        description: 'Full base64 data URL, e.g. data:image/png;base64,...',
        minLength: 10,
        maxLength: 3500000, // ~2.5 MB image ceiling
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        updatedAt: { type: 'string' },
      },
    },
    400: errorResponse,
    403: errorResponse,
    413: errorResponse,
    500: errorResponse,
  },
};
