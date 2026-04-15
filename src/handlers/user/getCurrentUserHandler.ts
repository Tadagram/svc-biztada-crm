import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

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
};

async function fetchCurrentUser(prisma: PrismaClient, userId: string) {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: userSelect,
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const caller = request.user as { userId: string; role: string };
    const user = await fetchCurrentUser(request.server.prisma, caller.userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: user,
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
