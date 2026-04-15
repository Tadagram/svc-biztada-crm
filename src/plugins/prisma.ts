import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
  interface FastifyRequest {
    prisma: PrismaClient;
  }
}

async function prismaPlugin(fastify: FastifyInstance) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  try {
    const prisma = new PrismaClient({
      log: ['error', 'warn'],
    });

    fastify.log.info('🗄️ Prisma Plugin: Initializing MySQL connection...');
    fastify.decorate('prisma', prisma);
    fastify.decorateRequest('prisma', {
      getter: () => fastify.prisma,
    });

    fastify.addHook('onClose', async (server) => {
      fastify.log.info('🗄️ Prisma Plugin: Disconnecting...');
      await server.prisma.$disconnect();
    });
  } catch (error) {
    fastify.log.error('❌ Prisma Plugin Error: Could not initialize Prisma with Adapter.');
    throw error;
  }
}

export default fp(prismaPlugin);

