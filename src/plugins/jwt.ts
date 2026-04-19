import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fs from 'fs';
import path from 'path';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      role: string | null;
      agencyName?: string | null;
      parentUserId?: string | null;
      sessionId: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function jwtPlugin(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || 'certs/private.pem';
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || 'certs/public.pem';

  try {
    const privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf8');
    const publicKey = fs.readFileSync(path.resolve(publicKeyPath), 'utf8');

    fastify.register(fastifyJwt, {
      secret: {
        private: privateKey,
        public: publicKey,
      },
      sign: { algorithm: 'RS256' },
    });

    // Thêm decorator authenticate để bảo vệ các route
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        request.log.warn({ err }, 'JWT verification failed');
        reply.status(401).send({
          success: false,
          message: 'Unauthorized',
        });
      }
    });

    fastify.log.info('🔐 JWT Plugin: Certificates loaded and registered successfully.');
  } catch (error) {
    fastify.log.error('❌ JWT Plugin Error: Could not load certificates.');
    throw error;
  }
}

export default fp(jwtPlugin);
