import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const QR_KEY = 'topup_qr_code';
const MAX_IMAGE_SIZE = 3_500_000; // 3.5 MB

interface UploadQRCodeBody {
  imageDataUrl: string;
}

function validateImageDataUrl(imageDataUrl: string): { valid: boolean; error?: string } {
  if (!imageDataUrl.startsWith('data:image/')) {
    return {
      valid: false,
      error: 'imageDataUrl phải là data URL hợp lệ (data:image/...)',
    };
  }

  if (imageDataUrl.length > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 2.5 MB.',
    };
  }

  return { valid: true };
}

async function upsertQRCodeSetting(prisma: PrismaClient, imageDataUrl: string) {
  return prisma.systemSettings.upsert({
    where: { key: QR_KEY },
    create: { key: QR_KEY, value: imageDataUrl },
    update: { value: imageDataUrl },
  });
}

export async function handler(
  request: FastifyRequest<{ Body: UploadQRCodeBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { imageDataUrl } = request.body;

  const validation = validateImageDataUrl(imageDataUrl);
  if (!validation.valid) {
    return reply.status(400).send({
      success: false,
      message: validation.error,
    });
  }

  const record = await upsertQRCodeSetting(prisma, imageDataUrl);

  return reply.send({
    success: true,
    updatedAt: record.updated_at.toISOString(),
  });
}
