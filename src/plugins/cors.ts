import fastifyPlugin from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

const FRONTEND_URL = process.env.FRONTEND_URL;
const MAX_AGE = 86400; // 24 hours

export default fastifyPlugin(async (fastify: FastifyInstance) => {
  const allowedOrigins = [FRONTEND_URL];

  await fastify.register(fastifyCors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: MAX_AGE,
  });

  fastify.log.info('✅ CORS configured');
});
