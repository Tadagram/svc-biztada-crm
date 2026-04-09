import 'dotenv/config';
import Fastify from 'fastify';

import jwtPlugin from '@plugins/jwt';
import compressionPlugin from '@plugins/compression';
import rateLimitPlugin from '@plugins/rateLimit';

const PORT = process.env.PORT || 3000;

const fastify = Fastify({
  logger: true,
});

fastify.register(jwtPlugin);
fastify.register(compressionPlugin);
fastify.register(rateLimitPlugin);

fastify.get('/health', async (_request, _reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`Server is running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
