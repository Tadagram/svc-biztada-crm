import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationBody {
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  image_url?: string;
  action_url?: string;
  custom_fields?: Record<string, unknown>;
  expires_at?: string;
}

export async function createNotificationHandler(
  request: FastifyRequest<{ Body: CreateNotificationBody }>,
  reply: FastifyReply,
) {
  const { prisma } = request;
  const caller = request.user;
  const { recipient_id, type, title, body, image_url, action_url, custom_fields, expires_at } =
    request.body;

  const recipient = await prisma.users.findUnique({
    where: { user_id: recipient_id, deleted_at: null },
    select: { user_id: true },
  });

  if (!recipient) {
    return reply.status(404).send({ success: false, message: 'Recipient user not found' });
  }

  const notification = await prisma.notifications.create({
    data: {
      recipient_id,
      sender_id: caller.userId,
      type,
      title,
      body,
      image_url: image_url ?? null,
      action_url: action_url ?? null,
      custom_fields:
        custom_fields !== undefined ? (custom_fields as Prisma.InputJsonValue) : Prisma.JsonNull,
      expires_at: expires_at ? new Date(expires_at) : null,
    },
    include: {
      sender: {
        select: { user_id: true, agency_name: true, phone_number: true },
      },
    },
  });

  return reply.status(201).send({
    success: true,
    message: 'Notification created',
    data: notification,
  });
}
