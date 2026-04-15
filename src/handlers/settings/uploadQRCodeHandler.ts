import { FastifyRequest, FastifyReply } from 'fastify';

const QR_KEY = 'topup_qr_code';

interface UploadQRCodeBody {
  imageDataUrl: string;
}

export async function uploadQRCodeHandler(
  request: FastifyRequest<{ Body: UploadQRCodeBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const { imageDataUrl } = request.body;

  // Must be a valid image data URL
  if (!imageDataUrl.startsWith('data:image/')) {
    return reply.status(400).send({
      success: false,
      message: 'imageDataUrl phải là data URL hợp lệ (data:image/...)',
    });
  }

  // 3.5 MB ceiling (Fastify schema already validates but double-check)
  if (imageDataUrl.length > 3_500_000) {
    return reply.status(413).send({
      success: false,
      message: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 2.5 MB.',
    });
  }

  const record = await prisma.systemSettings.upsert({
    where: { key: QR_KEY },
    create: { key: QR_KEY, value: imageDataUrl },
    update: { value: imageDataUrl },
  });

  return reply.send({
    success: true,
    updatedAt: record.updated_at.toISOString(),
  });
}
