import { FastifyRequest, FastifyReply } from 'fastify';

interface AddPermissionBody {
  name: string;
  code: string;
}

export async function addPermissionHandler(
  request: FastifyRequest<{
    Body: AddPermissionBody;
  }>,
  reply: FastifyReply,
) {
  const { prisma, log: logger } = request;
  const { name, code } = request.body;

  try {
    const hasPermissionResult = await prisma.permissions.findUnique({
      where: { code },
    });

    if (hasPermissionResult) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Permission with code "${code}" already exists`,
      });
    }

    const newPermission = await prisma.permissions.create({
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

export default addPermissionHandler;
