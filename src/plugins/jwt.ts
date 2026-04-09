import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fs from 'fs';
import path from 'path';

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

    fastify.log.info('🔐 JWT Plugin: Certificates loaded and registered successfully.');
  } catch (error) {
    fastify.log.error('❌ JWT Plugin Error: Could not load certificates.');
    throw error;
  }
}

export default fp(jwtPlugin);
