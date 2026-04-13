import { UserRole, UserStatus, PrismaClient } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';

interface CreateUserBody {
  phone_number: string;
  agency_name?: string;
  parent_user_id?: string;
  role?: UserRole;
  status?: UserStatus;
}

interface UserPayload {
  phone_number: string;
  role: UserRole;
  status: UserStatus;
  agency_name?: string;
  parent_user_id?: string;
}

interface UserResponse {
  user_id: string;
  phone_number: string;
  agency_name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
}

async function createUserInDatabase(
  prisma: PrismaClient,
  request: FastifyRequest<{ Body: CreateUserBody }>,
): Promise<UserResponse> {
  const {
    phone_number,
    agency_name,
    parent_user_id,
    role = UserRole.user,
    status = UserStatus.active,
  } = request.body;

  const userPayload: UserPayload = {
    phone_number,
    role,
    status,
  };

  if (agency_name) userPayload.agency_name = agency_name;
  if (parent_user_id) userPayload.parent_user_id = parent_user_id;

  const newUser = await prisma.users.create({
    data: userPayload,
    select: {
      user_id: true,
      phone_number: true,
      agency_name: true,
      role: true,
      status: true,
      created_at: true,
    },
  });

  return newUser;
}

async function handler(
  request: FastifyRequest<{
    Body: CreateUserBody;
  }>,
  reply: FastifyReply,
) {
  const { prisma, log: logger } = request;
  const { phone_number } = request.body;

  try {
    const existingUser = await prisma.users.findFirst({
      where: { phone_number },
    });

    if (existingUser) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Phone number already exists',
      });
    }

    const newUser = await createUserInDatabase(prisma, request);

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

export default handler;
