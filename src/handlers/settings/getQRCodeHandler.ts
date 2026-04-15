import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const QR_KEY = 'topup_qr_code';

async function getQRCodeSetting(prisma: PrismaClient) {
  return prisma.systemSettings.findUnique({
    where: { key: QR_KEY },
  });
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;

  const record = await getQRCodeSetting(prisma);

  if (!record) {
    return reply.send({ configured: false });
  }

  return reply.send({
    configured: true,
    imageDataUrl: record.value,
    updatedAt: record.updated_at.toISOString(),
  });
}
