import 'dotenv/config';
import Fastify from 'fastify';
import ajvErrors from 'ajv-errors';

import corsPlugin from '@plugins/cors';
import jwtPlugin from '@plugins/jwt';
import rbacPlugin from '@plugins/rbac';
import prismaPlugin from '@plugins/prisma';
import compressionPlugin from '@plugins/compression';
import rateLimitPlugin from '@plugins/rateLimit';
import swagger from '@plugins/swagger';
import routes from '@routes';

const PORT = process.env.PORT || 3000;

const fastify = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      allErrors: true,
      coerceTypes: true,
    },
    plugins: [ajvErrors] as any,
  },
});

fastify.register(corsPlugin);
fastify.register(jwtPlugin);
fastify.register(prismaPlugin);
fastify.register(rbacPlugin);
fastify.register(compressionPlugin);
fastify.register(rateLimitPlugin);
fastify.register(swagger);

fastify.register(routes);

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
