import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ASSIGNMENT_STATUSES, USER_ROLES, WORKER_STATUSES } from '@/utils/constants';

interface AssignWorkerToAgencyBody {
  agency_user_id: string;
  worker_id: string;
}

async function validateAgency(prisma: PrismaClient, agency_user_id: string) {
  const agency = await prisma.users.findFirst({
    where: { user_id: agency_user_id, role: USER_ROLES.AGENCY, deleted_at: null },
  });
  return agency;
}

async function validateWorker(prisma: PrismaClient, worker_id: string) {
  const worker = await prisma.workers.findFirst({
    where: { worker_id, deleted_at: null },
  });
  return worker;
}

async function checkExistingAssignment(prisma: PrismaClient, worker_id: string) {
  const existingAssignment = await prisma.agencyWorkers.findFirst({
    where: { worker_id, status: ASSIGNMENT_STATUSES.ACTIVE, deleted_at: null },
  });
  return existingAssignment;
}

async function assignWorkerWithTransaction(
  prisma: PrismaClient,
  agency_user_id: string,
  worker_id: string,
) {
  return prisma.$transaction(async (tx) => {
    const newAssignment = await tx.agencyWorkers.create({
      data: { agency_user_id, worker_id, status: ASSIGNMENT_STATUSES.ACTIVE },
      select: {
        agency_worker_id: true,
        agency_user_id: true,
        worker_id: true,
        status: true,
        using_by: true,
        created_at: true,
        agency: {
          select: { user_id: true, agency_name: true, phone_number: true },
        },
        worker: { select: { worker_id: true, name: true, status: true } },
      },
    });

    await tx.workers.update({
      where: { worker_id },
      data: { status: WORKER_STATUSES.BUSY },
    });

    return newAssignment;
  });
}

export async function handler(
  request: FastifyRequest<{ Body: AssignWorkerToAgencyBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { agency_user_id, worker_id } = request.body;

  try {
    const agency = await validateAgency(prisma, agency_user_id);
    if (!agency) {
      return reply.status(404).send({
        success: false,
        message: 'Agency not found or user is not an agency',
      });
    }

    const worker = await validateWorker(prisma, worker_id);
    if (!worker) {
      return reply.status(404).send({ success: false, message: 'Worker not found' });
    }

    const existingAssignment = await checkExistingAssignment(prisma, worker_id);
    if (existingAssignment) {
      return reply.status(409).send({
        success: false,
        message: 'Worker is already assigned to an agency',
      });
    }

    const assignment = await assignWorkerWithTransaction(prisma, agency_user_id, worker_id);

    return reply.status(201).send({
      success: true,
      data: assignment,
      message: 'Worker assigned to agency successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to assign worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
