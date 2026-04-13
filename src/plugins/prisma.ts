import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '.prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });

    fastify.log.info('🐘 Prisma Plugin: Initializing with Driver Adapter (pg)...');
    fastify.decorate('prisma', prisma);
    fastify.decorateRequest('prisma', {
      getter: () => fastify.prisma,
    });

    fastify.addHook('onClose', async (server) => {
      fastify.log.info('🐘 Prisma Plugin: Disconnecting and closing Pool...');
      await server.prisma.$disconnect();
      await pool.end();
    });
  } catch (error) {
    fastify.log.error('❌ Prisma Plugin Error: Could not initialize Prisma with Adapter.');
    throw error;
  }
}

export default fp(prismaPlugin);
