import { FastifyReply, FastifyRequest } from 'fastify';

interface LoginGuestQuery {
  phone: string;
}

interface GuestRow {
  guest_id: string;
  phone: string;
  business_name: string;
}

function sanitizePhone(input: string): string {
  return input.replace(/[^0-9+\-\s]/g, '').trim().slice(0, 20);
}

export async function handler(
  request: FastifyRequest<{ Querystring: LoginGuestQuery }>,
  reply: FastifyReply,
) {
  const phone = sanitizePhone(request.query.phone ?? '');

  if (!phone) {
    return reply.status(400).send({ success: false, error: 'phone is required' });
  }

  const rows = await request.prisma.$queryRaw<GuestRow[]>`
    SELECT guest_id, phone, business_name
    FROM guests_info
    WHERE deleted_at IS NULL
      AND phone = ${phone}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return reply.status(404).send({ success: false, error: 'Phone number not found' });
  }

  const guest = rows[0];
  return reply.send({
    success: true,
    data: {
      guestId: guest.guest_id,
      phone: guest.phone,
      businessName: guest.business_name,
    },
  });
}
