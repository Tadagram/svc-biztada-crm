import Fastify from 'fastify';

const fastify = Fastify({
  logger: true,
});

// Declare a route
fastify.get('/', async (_request, _reply) => {
  return { hello: 'world' };
});

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server is running at http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
