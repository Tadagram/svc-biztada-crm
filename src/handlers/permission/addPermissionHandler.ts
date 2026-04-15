import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface AddPermissionBody {
  name: string;
  code: string;
}

async function checkPermissionExists(prisma: PrismaClient, code: string) {
  return prisma.permissions.findUnique({
    where: { code },
  });
}

async function createPermission(prisma: PrismaClient, name: string, code: string) {
  return prisma.permissions.create({
    data: {
      name,
      code,
    },
    select: {
      permission_id: true,
      name: true,
      code: true,
      created_at: true,
    },
  });
}

export async function handler(
  request: FastifyRequest<{
    Body: AddPermissionBody;
  }>,
  reply: FastifyReply,
) {
  const { prisma, log: logger } = request;
  const { name, code } = request.body;

  try {
    const hasPermissionResult = await checkPermissionExists(prisma, code);

    if (hasPermissionResult) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Permission with code "${code}" already exists`,
      });
    }

    const newPermission = await createPermission(prisma, name, code);

    return reply.status(201).send({
      statusCode: 201,
      message: 'Permission created successfully',
      data: newPermission,
    });
  } catch (error) {
    logger.error({ err: error }, '[AddPermissionHandler] Unexpected error');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create permission',
    });
  }
}

export default handler;
