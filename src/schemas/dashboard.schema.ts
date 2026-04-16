export const getRevenueSchema = {
  description: 'Get revenue data for dashboard (MOD, AGENCY, USER)',
  tags: ['dashboard'],
  querystring: {
    type: 'object',
    properties: {
      days: { type: 'string', default: '30', description: 'Number of days to fetch (1-365)' },
    },
  },
  response: {
    200: {
      description: 'Revenue data',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalRevenue: { type: 'number' },
            totalTransactions: { type: 'number' },
            avgDaily: { type: 'number' },
            period: { type: 'number' },
            chartData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  revenue: { type: 'number' },
                  count: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
};
