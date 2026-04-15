import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

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

function validateAgencyName(agencyName?: string): { valid: boolean; error?: string } {
  if (!agencyName || !agencyName.trim()) {
    return { valid: false, error: 'agency_name is required' };
  }
  return { valid: true };
}

async function updateUserProfile(prisma: PrismaClient, userId: string, agencyName: string) {
  return prisma.users.update({
    where: { user_id: userId },
    data: {
      agency_name: agencyName.trim(),
      updated_at: new Date(),
    },
    select: userSelect,
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const caller = request.user as { userId: string; role: string };
    const { agency_name } = request.body as { agency_name?: string };

    const validation = validateAgencyName(agency_name);
    if (!validation.valid) {
      return reply.status(400).send({
        success: false,
        message: validation.error,
      });
    }

    const updatedUser = await updateUserProfile(request.server.prisma, caller.userId, agency_name!);

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
