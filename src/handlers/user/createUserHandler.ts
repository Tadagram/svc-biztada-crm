import { UserRole, UserStatus } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createUserInDatabase, checkUserExists, CreateUserBody, UserPayload } from './userHelper';
import { CAN_CREATE_USER, USER_ROLES } from '@/utils/constants';

export async function createUserHandler(
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

  try {
    // 🔐 Role check: chỉ Mod & Agency được tạo user
    const caller = request.user as { userId: string; role: UserRole };
    if (!CAN_CREATE_USER.includes(caller.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only mod and agency can create users',
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

    // 🔐 Mod tạo agency, Agency tạo user/customer
    if (caller.role === USER_ROLES.MOD && role !== USER_ROLES.AGENCY) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Mod can only create agency',
      });
    }

    if (caller.role === USER_ROLES.AGENCY && role === USER_ROLES.AGENCY) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Agency cannot create agency',
      });
    }

    const userPayload: UserPayload = {
      phone_number,
      role,
      status,
    };

    if (agency_name) userPayload.agency_name = agency_name;

    // 🔐 Set parent_user_id
    if (caller.role === USER_ROLES.MOD && role === USER_ROLES.AGENCY) {
      userPayload.parent_user_id = caller.userId; // Mod tạo agency → parent = mod
    } else if (caller.role === USER_ROLES.AGENCY) {
      userPayload.parent_user_id = caller.userId; // Agency tạo user/customer → parent = agency
    }

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

export default createUserHandler;
