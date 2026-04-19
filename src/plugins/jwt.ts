import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

interface CoreAuthMeResponse {
  success: boolean;
  user?: {
    telegram_id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

interface CoreAdminCheckResponse {
  exists: boolean;
  is_admin: boolean;
  user_id?: string;
  telegram_id?: number;
  first_name?: string;
  phone?: string;
}

async function authenticateTopupViaCoreToken(request: FastifyRequest): Promise<boolean> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  if (!request.url.startsWith('/topup/')) return false;

  const meRes = await fetch(`${CORE_API_URL}/api/auth/me`, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(10_000),
  });
  if (!meRes.ok) return false;

  const meJson = (await meRes.json()) as CoreAuthMeResponse;
  const telegramId = meJson.user?.telegram_id;
  if (!telegramId) return false;

  const adminCheckRes = await fetch(
    `${CORE_API_URL}/internal/users/admin-check?telegram_id=${telegramId}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!adminCheckRes.ok) return false;

  const coreUser = (await adminCheckRes.json()) as CoreAdminCheckResponse;
  if (!coreUser.exists || !coreUser.user_id) return false;

  const resolvedPhone = coreUser.phone ?? `tg_${telegramId}`;

  const user = await request.server.prisma.users.upsert({
    where: { user_id: coreUser.user_id },
    create: {
      user_id: coreUser.user_id,
      phone_number: resolvedPhone,
      role: UserRole.user,
      status: UserStatus.active,
    },
    update: {
      status: UserStatus.active,
      phone_number: resolvedPhone,
    },
  });

  request.user = {
    userId: user.user_id,
    role: user.role,
    agencyName: user.agency_name,
    parentUserId: user.parent_user_id,
    sessionId: `core:${coreUser.user_id ?? telegramId}`,
  };

  request.log.info(
    { userId: user.user_id, telegramId, route: request.url },
    'Authenticated topup request via core-api fallback',
  );

  return true;
}

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
        request.log.warn({ err, route: request.url }, 'JWT verification failed');

        try {
          if (await authenticateTopupViaCoreToken(request)) {
            return;
          }
        } catch (fallbackErr) {
          request.log.error({ err: fallbackErr, route: request.url }, 'Core token fallback failed');
        }

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
