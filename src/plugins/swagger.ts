import fastifyPlugin from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

export default fastifyPlugin(async (fastify: FastifyInstance) => {
  // Register Swagger
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Worker Backend API',
        version: '1.0.0',
        description:
          'Comprehensive Worker Management API - Handle users, workers, permissions, and assignments',
        contact: {
          name: 'Support Team',
          email: 'support@example.com',
        },
        license: {
          name: 'ISC',
        },
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: 'Development Server',
        },
        {
          url: 'https://api.example.com',
          description: 'Production Server',
        },
      ],
      tags: [
        { name: 'Health', description: 'API health check endpoints' },
        { name: 'Authentication', description: 'Authentication and token endpoints' },
        { name: 'Users', description: 'User management operations' },
        { name: 'Workers', description: 'Worker management operations' },
        { name: 'AgencyWorker', description: 'Agency-Worker assignment operations' },
        { name: 'Usage Logs', description: 'Worker usage history and logs' },
        { name: 'Permissions', description: 'Permission management operations' },
        { name: 'Permission Check', description: 'Check user permission endpoints' },
        { name: 'User Permissions', description: 'Assign / revoke permissions per user' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token for authentication',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
});
