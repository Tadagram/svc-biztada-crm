import { UserRole, UserStatus } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createUserInDatabase, checkUserExists, CreateUserBody, UserPayload } from './userHelper';
import { CAN_CREATE_USER, USER_ROLES } from '@/utils/constants';

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

function validateCallerRole(callerRole: UserRole | null): { valid: boolean; error?: string } {
  if (callerRole === null) return { valid: true }; // admin → full access
  if (!CAN_CREATE_USER.includes(callerRole)) {
    return { valid: false, error: 'Only admin and mod can create users' };
  }
  return { valid: true };
}

function validateUserRoleCreation(
  callerRole: UserRole | null,
  targetRole: UserRole,
): { valid: boolean; error?: string } {
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
  return role === null || role === UserRole.mod || role === UserRole.agency || role === UserRole.accountant;
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

    const userPayload = buildUserPayload(
      phone_number,
      role,
      status,
      caller.role,
      caller.userId,
      agency_name,
    );
    const newUser = await createUserInDatabase(prisma, userPayload);

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
