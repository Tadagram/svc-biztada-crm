import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';

const MAX_REQUESTS_PER_MINUTE = 300;
const TIME_WINDOW = 60 * 1000; // 1 minute

async function rateLimitPlugin(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.register(fastifyRateLimit, {
    max: MAX_REQUESTS_PER_MINUTE,
    timeWindow: TIME_WINDOW,
  });
}

export default fp(rateLimitPlugin);
