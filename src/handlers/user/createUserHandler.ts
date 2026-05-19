import { UserRole, UserStatus } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createUserInDatabase, checkUserExists, CreateUserBody, UserPayload } from './userHelper';
import { CAN_CREATE_USER, USER_ROLES } from '@/utils/constants';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

async function getCoreUserUUID(phone: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${CORE_API_URL}/internal/users/admin-check?phone=${encodeURIComponent(phone)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { exists: boolean; user_id?: string };
    return json.exists && json.user_id ? json.user_id : null;
  } catch {
    return null;
  }
}

function validateCallerRole(callerRole: UserRole | null): { valid: boolean; error?: string } {
  if (callerRole === UserRole.admin) return { valid: true };
  if (callerRole === null || !CAN_CREATE_USER.includes(callerRole)) {
    return { valid: false, error: 'Only admin and mod can create users' };
  }
  return { valid: true };
}

function validateUserRoleCreation(
  callerRole: UserRole | null,
  targetRole: UserRole,
): { valid: boolean; error?: string } {
  if (targetRole === UserRole.admin && callerRole !== UserRole.admin) {
    return { valid: false, error: 'Only admin can assign admin role' };
  }

  if (targetRole === USER_ROLES.CUSTOMER) {
    return { valid: false, error: 'Customer role cannot be created from CRM user manager' };
  }

  if (callerRole === USER_ROLES.MOD && targetRole === USER_ROLES.MOD) {
    return { valid: false, error: 'Mod cannot create another mod' };
  }

  return { valid: true };
}

function buildUserPayload(
  phoneNumber: string,
  role: UserRole,
  status: UserStatus,
  callerRole: UserRole | null,
  callerId: string,
  agencyName?: string,
): UserPayload {
  const payload: UserPayload = {
    phone_number: phoneNumber,
    role,
    status,
  };

  if (agencyName) payload.agency_name = agencyName;

  if (callerRole === USER_ROLES.MOD && role === USER_ROLES.AGENCY) {
    payload.parent_user_id = callerId;
  }

  return payload;
}

function shouldGrantCoreAdmin(role: UserRole | null | undefined): boolean {
  return (
    role === UserRole.admin ||
    role === UserRole.mod ||
    role === UserRole.agency ||
    role === UserRole.accountant
  );
}

async function syncCoreAdminStatus(phone: string, role: UserRole | null): Promise<void> {
  const response = await fetch(`${CORE_API_URL}/internal/users/admin-grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone,
      is_admin: shouldGrantCoreAdmin(role),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`core-api admin-grant failed ${response.status}: ${text}`);
  }
}

export async function handler(
  request: FastifyRequest<{
    Body: CreateUserBody;
  }>,
  reply: FastifyReply,
) {
  const { prisma, log: logger } = request;
  const {
    phone_number,
    agency_name,
    role = UserRole.user,
    status = UserStatus.active,
  } = request.body;
  const caller = request.user as { userId: string; role: UserRole | null };

  try {
    const roleValidation = validateCallerRole(caller.role);
    if (!roleValidation.valid) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: roleValidation.error,
      });
    }

    const existingUser = await checkUserExists(prisma, phone_number);
    if (existingUser) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Phone number already exists',
      });
    }

    const roleValidationResult = validateUserRoleCreation(caller.role, role);
    if (!roleValidationResult.valid) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: roleValidationResult.error,
      });
    }

    await syncCoreAdminStatus(phone_number, role);

    // Fetch core-api UUID to use as CRM user_id (single source of truth)
    const coreUUID = await getCoreUserUUID(phone_number);

    const userPayload = buildUserPayload(
      phone_number,
      role,
      status,
      caller.role,
      caller.userId,
      agency_name,
    );
    if (coreUUID) userPayload.user_id = coreUUID;
    const newUser = await createUserInDatabase(prisma, userPayload);

    // Grant new-user bonus credits if configured
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
              created_by: caller.userId,
              metadata: { source: 'new_user_bonus' },
            },
          });
        });
      }
    } catch (bonusErr) {
      logger.warn({ err: bonusErr }, '[CreateUser] Failed to grant new-user bonus');
    }

    return reply.status(201).send({
      statusCode: 201,
      message: 'User created successfully',
      data: newUser,
    });
  } catch (error) {
    logger.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create user',
    });
  }
}
