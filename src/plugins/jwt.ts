import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

interface CoreAuthMeResponse {
  valid: boolean;
  user?: {
    id?: string;
    telegram_id?: number;
  };
}

interface CoreAuthLegacyMeResponse {
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

function normalizePhone(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('tg_')) return trimmed;
  return trimmed.replace(/\D/g, '');
}

function buildPhoneVariants(input?: string | null): string[] {
  const raw = (input ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('tg_')) return [raw];

  const digits = normalizePhone(raw);
  if (!digits) return [raw];

  const variants = new Set<string>([raw, digits, `+${digits}`]);

  if (digits.startsWith('84')) {
    const local = `0${digits.slice(2)}`;
    variants.add(local);
    variants.add(`+${local}`);
  }

  if (digits.startsWith('0')) {
    const intl = `84${digits.slice(1)}`;
    variants.add(intl);
    variants.add(`+${intl}`);
  }

  return Array.from(variants).filter(Boolean);
}

async function resolveOrCreateCoreMappedUser(
  request: FastifyRequest,
  coreUserId: string,
  resolvedPhone: string,
) {
  const prisma = request.server.prisma;

  const coreMapped = await prisma.users.findUnique({
    where: { user_id: coreUserId },
  });

  if (coreMapped) {
    return prisma.users.update({
      where: { user_id: coreMapped.user_id },
      data: { status: UserStatus.active },
    });
  }

  const phoneMatched = await prisma.users.findUnique({
    where: { phone_number: resolvedPhone },
  });

  const variantMatched =
    phoneMatched ||
    (await prisma.users.findFirst({
      where: {
        phone_number: {
          in: buildPhoneVariants(resolvedPhone),
        },
      },
    }));

  if (variantMatched) {
    request.log.warn(
      {
        coreUserId,
        crmUserId: variantMatched.user_id,
        phone: resolvedPhone,
        route: request.url,
      },
      'Core user_id mismatches CRM user for same phone; migrating CRM user_id to core user_id',
    );

    return prisma.users.update({
      where: { user_id: variantMatched.user_id },
      data: {
        user_id: coreUserId,
        phone_number: resolvedPhone,
        status: UserStatus.active,
      },
    });
  }

  return prisma.users
    .create({
      data: {
        user_id: coreUserId,
        phone_number: resolvedPhone,
        role: UserRole.user,
        status: UserStatus.active,
      },
    })
    .then(async (newUser) => {
      // Grant new-user welcome bonus (non-blocking, non-fatal)
      try {
        const bonusSetting = await prisma.systemSettings.findUnique({
          where: { key: 'new_user_bonus_credits' },
        });
        const bonusAmount = bonusSetting ? Number(bonusSetting.value) : 0;
        if (bonusAmount > 0) {
          await prisma.$transaction(async (tx) => {
            const balance = await tx.userCreditBalances.upsert({
              where: { user_id: newUser.user_id },
              update: { available_credits: { increment: bonusAmount } },
              create: { user_id: newUser.user_id, available_credits: bonusAmount },
              select: { available_credits: true },
            });
            await tx.creditLedgerEntries.create({
              data: {
                user_id: newUser.user_id,
                entry_type: 'ADJUSTMENT',
                direction: 'CREDIT',
                amount: bonusAmount,
                balance_after: balance.available_credits,
                purpose: 'New user welcome bonus',
                created_by: newUser.user_id,
                metadata: { source: 'new_user_bonus' },
              },
            });
          });
          request.log.info(
            { userId: newUser.user_id, bonusAmount },
            '[NewUserBonus] Welcome bonus credited',
          );
        }
      } catch (bonusErr) {
        request.log.warn(
          { err: bonusErr, userId: newUser.user_id },
          '[NewUserBonus] Failed to grant welcome bonus',
        );
      }
      return newUser;
    });
}

async function authenticateTopupViaCoreToken(request: FastifyRequest): Promise<boolean> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const supportsCoreFallback =
    request.url.startsWith('/topup/') ||
    request.url.startsWith('/service-packages') ||
    request.url.startsWith('/assistant/');
  if (!supportsCoreFallback) return false;

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) return false;

  let telegramId: number | undefined;

  // Preferred path: verify-session validates JWT directly and returns user telegram_id.
  // /api/auth/me in svc-core-api depends on context middleware and is unreliable
  // for service-to-service requests.
  const verifyRes = await fetch(
    `${CORE_API_URL}/api/auth/verify-session?token=${encodeURIComponent(rawToken)}`,
    { signal: AbortSignal.timeout(10_000) },
  );

  if (verifyRes.ok) {
    const verifyJson = (await verifyRes.json()) as CoreAuthMeResponse;
    if (verifyJson.valid) {
      telegramId = verifyJson.user?.telegram_id;
    }
  }

  // Backward-compat fallback for environments where verify-session is unavailable.
  if (!telegramId) {
    const meRes = await fetch(`${CORE_API_URL}/api/auth/me`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10_000),
    });

    if (!meRes.ok) return false;

    const meJson = (await meRes.json()) as CoreAuthLegacyMeResponse;
    telegramId = meJson.user?.telegram_id;
  }

  if (!telegramId) return false;

  const adminCheckRes = await fetch(
    `${CORE_API_URL}/internal/users/admin-check?telegram_id=${telegramId}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!adminCheckRes.ok) return false;

  const coreUser = (await adminCheckRes.json()) as CoreAdminCheckResponse;
  if (!coreUser.exists || !coreUser.user_id) return false;

  const resolvedPhone = coreUser.phone ?? `tg_${telegramId}`;

  const user = await resolveOrCreateCoreMappedUser(request, coreUser.user_id, resolvedPhone);

  request.user = {
    userId: user.user_id,
    role: user.role,
    agencyName: user.agency_name,
    parentUserId: user.parent_user_id,
    sessionId: `core:${coreUser.user_id ?? telegramId}`,
  };

  request.log.info(
    { userId: user.user_id, telegramId, route: request.url },
    'Authenticated request via core-api fallback',
  );

  return true;
}

async function syncRequestUserFromDatabase(request: FastifyRequest): Promise<boolean> {
  const payload = request.user as {
    userId?: string;
    user_id?: string;
    sessionId?: string;
  };

  const userId = payload?.userId || payload?.user_id;
  if (!userId) return false;

  const dbUser = await request.server.prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      role: true,
      agency_name: true,
      parent_user_id: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!dbUser) return false;
  if (dbUser.deleted_at) return false;
  if (dbUser.status !== UserStatus.active) return false;

  request.user = {
    userId: dbUser.user_id,
    role: dbUser.role,
    agencyName: dbUser.agency_name,
    parentUserId: dbUser.parent_user_id,
    sessionId: payload.sessionId ?? `jwt:${dbUser.user_id}`,
  };

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
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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

        const synced = await syncRequestUserFromDatabase(request);
        if (!synced) {
          return reply.status(401).send({
            success: false,
            message: 'Unauthorized',
          });
        }
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

    // Thêm decorator optionalAuthenticate cho các route cho phép Guest
    fastify.decorate('optionalAuthenticate', async (request: FastifyRequest) => {
      try {
        await request.jwtVerify();
        await syncRequestUserFromDatabase(request);
      } catch (err) {
        try {
          await authenticateTopupViaCoreToken(request);
        } catch (fallbackErr) {
          // Ignore error for optional auth
        }
      }
    });

    fastify.log.info('🔐 JWT Plugin: Certificates loaded and registered successfully.');
  } catch (error) {
    fastify.log.error('❌ JWT Plugin Error: Could not load certificates.');
    throw error;
  }
}

export default fp(jwtPlugin);
