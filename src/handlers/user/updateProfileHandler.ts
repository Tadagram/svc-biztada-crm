import { FastifyRequest, FastifyReply } from 'fastify';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

const userSelect = {
  user_id: true,
  phone_number: true,
  agency_name: true,
  role: true,
  status: true,
  parent_user_id: true,
  created_at: true,
  updated_at: true,
};

function validateInput(payload: { email?: string }): { valid: boolean; error?: string } {
  if (typeof payload.email === 'string' && payload.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email.trim())) {
      return { valid: false, error: 'email is invalid' };
    }
  }

  return { valid: true };
}

function splitName(name?: string): { firstName: string; lastName: string } {
  const normalized = (name ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

async function updateCoreProfile(
  userId: string,
  payload: {
    name?: string;
    telegram_username?: string;
    username?: string;
    phone?: string;
    email?: string;
  },
) {
  const { firstName, lastName } = splitName(payload.name);
  const username = (payload.telegram_username ?? payload.username ?? '').trim();
  const phone = (payload.phone ?? '').trim();
  const email = (payload.email ?? '').trim();

  const body = {
    first_name: firstName,
    last_name: lastName,
    username,
    telegram_phone: phone,
    metadata: {
      email,
    },
  };

  const response = await fetch(`${CORE_API_URL}/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`core-api update failed ${response.status}: ${text}`);
  }

  return (await response.json()) as {
    data?: {
      telegram_id?: number;
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      telegram_phone?: string | null;
      email?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const caller = request.user as { userId: string; role: string };
    const payload = request.body as {
      name?: string;
      telegram_username?: string;
      username?: string;
      phone?: string;
      email?: string;
    };

    const validation = validateInput(payload);
    if (!validation.valid) {
      return reply.status(400).send({
        success: false,
        message: validation.error,
      });
    }

    const [coreResult, crmUser] = await Promise.all([
      updateCoreProfile(caller.userId, payload),
      request.server.prisma.users.findUnique({
        where: { user_id: caller.userId },
        select: userSelect,
      }),
    ]);

    if (!crmUser) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    const updatedUser = {
      ...crmUser,
      name: `${coreResult.data?.first_name ?? ''} ${coreResult.data?.last_name ?? ''}`.trim(),
      telegram_id: coreResult.data?.telegram_id ?? null,
      telegram_username: coreResult.data?.username ?? '',
      phone: coreResult.data?.telegram_phone ?? '',
      email: coreResult.data?.email ?? '',
      created_at: coreResult.data?.created_at ?? crmUser.created_at,
      updated_at: coreResult.data?.updated_at ?? crmUser.updated_at,
    };

    return reply.send({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
