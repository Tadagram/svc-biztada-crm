import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

interface CoreUserProfile {
  telegram_id?: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  telegram_phone?: string | null;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

const userSelect = {
  user_id: true,
  phone_number: true,
  agency_name: true,
  role: true,
  status: true,
  parent_user_id: true,
  last_active_at: true,
  created_at: true,
  updated_at: true,
  credit_balance: {
    select: {
      available_credits: true,
    },
  },
};

async function fetchCurrentUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: userSelect,
  });
}

function combineName(firstName?: string | null, lastName?: string | null, fallback = ''): string {
  const full = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return full || fallback;
}

async function fetchCoreUser(userId: string): Promise<CoreUserProfile> {
  const response = await fetch(`${CORE_API_URL}/api/users/${userId}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`core-api responded ${response.status}`);
  }

  const payload = (await response.json()) as { data?: CoreUserProfile };

  return payload.data ?? {};
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const caller = request.user as { userId: string; role: string };
    const [user, coreUser] = await Promise.all([
      fetchCurrentUser(request.server.prisma, caller.userId),
      fetchCoreUser(caller.userId).catch((err: unknown) => {
        request.log.warn({ err, userId: caller.userId }, 'Failed to fetch profile from core-api');
        return {} as CoreUserProfile;
      }),
    ]);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    const normalizedUser = {
      ...user,
      name: combineName(coreUser.first_name, coreUser.last_name, user.agency_name ?? ''),
      telegram_id: coreUser.telegram_id ?? null,
      telegram_username: coreUser.username ?? '',
      phone: coreUser.telegram_phone ?? '',
      email: coreUser.email ?? '',
      credit_balance: undefined,
      available_credits: user.credit_balance?.available_credits?.toString?.() ?? '0.00',
      created_at: coreUser.created_at ?? user.created_at,
      updated_at: coreUser.updated_at ?? user.updated_at,
    };

    return reply.send({
      success: true,
      data: normalizedUser,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch profile',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
