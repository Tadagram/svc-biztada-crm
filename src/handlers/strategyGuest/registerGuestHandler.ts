import { FastifyReply, FastifyRequest } from 'fastify';

interface RegisterGuestBody {
  phone: string;
  businessName: string;
}

interface GuestRow {
  guest_id: string;
  phone: string;
  business_name: string;
  created_at: Date;
}

function sanitizePhone(input: string): string {
  // Keep only digits, +, -, spaces; max 20 chars
  return input.replace(/[^0-9+\-\s]/g, '').trim().slice(0, 20);
}

export async function handler(
  request: FastifyRequest<{ Body: RegisterGuestBody }>,
  reply: FastifyReply,
) {
  const phone = sanitizePhone(request.body.phone);
  const businessName = request.body.businessName.trim().slice(0, 255);

  if (!phone) {
    return reply.status(400).send({ success: false, error: 'phone is required' });
  }
  if (!businessName) {
    return reply.status(400).send({ success: false, error: 'businessName is required' });
  }

  // Find-or-create by phone number
  const existing = await request.prisma.$queryRaw<GuestRow[]>`
    SELECT guest_id, phone, business_name, created_at
    FROM guests_info
    WHERE deleted_at IS NULL
      AND phone = ${phone}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const guest = existing[0];
    // Update business name if it changed
    if (guest.business_name !== businessName) {
      await request.prisma.$executeRaw`
        UPDATE guests_info
        SET business_name = ${businessName}, updated_at = NOW()
        WHERE guest_id = ${guest.guest_id}
      `;
    }
    return reply.send({
      success: true,
      data: {
        guestId: guest.guest_id,
        phone: guest.phone,
        businessName,
        isNew: false,
      },
    });
  }

  // Create new guest
  const newGuestId = crypto.randomUUID();
  await request.prisma.$executeRaw`
    INSERT INTO guests_info (guest_id, phone, business_name, created_at, updated_at)
    VALUES (${newGuestId}, ${phone}, ${businessName}, NOW(), NOW())
  `;

  return reply.status(201).send({
    success: true,
    data: {
      guestId: newGuestId,
      phone,
      businessName,
      isNew: true,
    },
  });
}
