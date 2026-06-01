import { FastifySchema } from 'fastify';

export const consultSchema: FastifySchema = {
  tags: ['Strategy Session'],
  summary: 'AI consulting — RAG-powered strategy advice',
  description:
    'Forwards the question to svc-ai-controller RAG pipeline and returns an AI-generated action plan. ' +
    'Logs the session to strategy_session_logs when userId is present (JWT or query param).',
  body: {
    type: 'object',
    required: ['question'],
    properties: {
      question: { type: 'string', minLength: 1, maxLength: 2000 },
      context: {
        type: 'object',
        properties: {
          industry: { type: 'string', maxLength: 50 },
          business_size: {
            type: 'string',
            enum: ['micro', 'small', 'medium', 'large'],
          },
          current_tools: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 20,
          },
          goal: { type: 'string', maxLength: 50 },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      guestId: { type: 'string' },
    },
  },
};

export const feedbackSchema: FastifySchema = {
  tags: ['Strategy Session'],
  summary: 'Submit feedback for a consult session',
  description: 'Saves a 1–5 score and optional note for a past consult session.',
  body: {
    type: 'object',
    required: ['session_id', 'score'],
    properties: {
      session_id: { type: 'string', minLength: 36, maxLength: 36 },
      score: { type: 'integer', minimum: 1, maximum: 5 },
      note: { type: 'string', maxLength: 500 },
    },
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      guestId: { type: 'string' },
    },
  },
};

export const historySchema: FastifySchema = {
  tags: ['Strategy Session'],
  summary: 'List user consult session history',
  description: 'Returns paginated list of past AI consulting sessions for a user.',
  querystring: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      guestId: { type: 'string' },
      page: { type: 'string' },
      limit: { type: 'string' },
    },
  },
};

export const claimGuestSchema: FastifySchema = {
  tags: ['Strategy Session'],
  summary: 'Claim guest strategy data for an authenticated user',
  description:
    'Atomically migrates all strategy data (slides + session logs) from a guest session to a ' +
    'registered user. Call once after registration when the user previously interacted as a guest. ' +
    'Requires userId from JWT or ?userId query param.',
  body: {
    type: 'object',
    required: ['guestId'],
    properties: {
      guestId: { type: 'string', minLength: 36, maxLength: 36 },
    },
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
  },
};
