import { UserRole, UserStatus } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createUserInDatabase, checkUserExists, CreateUserBody, UserPayload } from './userHelper';

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
    parent_user_id,
    role = UserRole.user,
    status = UserStatus.active,
  } = request.body;

  try {
    const existingUser = await checkUserExists(prisma, phone_number);

    if (existingUser) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Phone number already exists',
      });
    }

    const userPayload: UserPayload = {
      phone_number,
      role,
      status,
    };

    if (agency_name) userPayload.agency_name = agency_name;
    if (parent_user_id) userPayload.parent_user_id = parent_user_id;

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
