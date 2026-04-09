import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fs from 'fs/promises';
import path from 'path';

/**
 * Plugin để khởi tạo JWT với cặp khóa RSA256
 */
async function jwtPlugin(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || 'certs/private.pem';
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || 'certs/public.pem';

  try {
    // Đọc nội dung chứng chỉ (Dùng async readFile của fs/promises)
    const privateKey = await fs.readFile(path.resolve(privateKeyPath), 'utf8');
    const publicKey = await fs.readFile(path.resolve(publicKeyPath), 'utf8');

    // Đăng ký Plugin JWT chính thức của Fastify
    await fastify.register(fastifyJwt, {
      secret: {
        private: privateKey,
        public: publicKey,
      },
      sign: { algorithm: 'RS256' },
      verify: { algorithms: ['RS256'] },
    });

    fastify.log.info('🔐 JWT Plugin: Certificates loaded and registered successfully.');
  } catch (error) {
    fastify.log.error(
      '❌ JWT Plugin Error: Could not load certificates. Ensure certs/ folder exists.',
    );
    throw error;
  }
}

export default fp(jwtPlugin);
