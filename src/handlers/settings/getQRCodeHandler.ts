import { FastifyRequest, FastifyReply } from 'fastify';

const QR_KEY = 'topup_qr_code';

export async function getQRCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { prisma } = request;

  const record = await prisma.systemSettings.findUnique({
    where: { key: QR_KEY },
  });

  if (!record) {
    return reply.send({ configured: false });
  }

  return reply.send({
    configured: true,
    imageDataUrl: record.value,
    updatedAt: record.updated_at.toISOString(),
  });
}
