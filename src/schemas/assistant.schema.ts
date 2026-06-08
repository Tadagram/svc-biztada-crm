import { FastifySchema } from 'fastify';

export const chatAssistantSchema: FastifySchema = {
  description: 'Chat with Biztada Virtual Assistant',
  tags: ['Assistant'],
  summary: 'Send message to assistant and get response',
  headers: {
    type: 'object',
    required: ['x-business-id'],
    properties: {
      'x-business-id': { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        reply: { type: 'string' },
        actionPayloads: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
        toolActions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

export const historyAssistantSchema: FastifySchema = {
  description: 'Get chat history with Biztada Virtual Assistant',
  tags: ['Assistant'],
  summary: 'Retrieve chat history for the current user and business',
  headers: {
    type: 'object',
    required: ['x-business-id'],
    properties: {
      'x-business-id': { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
              timestamp: { type: 'string' },
              toolActions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};
