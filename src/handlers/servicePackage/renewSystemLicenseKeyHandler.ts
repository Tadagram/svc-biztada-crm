import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { getPortalLicenseById, renewPortalLicense } from '@services/corePortalLicenses';

interface RenewSystemLicenseKeyParams {
  keyId: string;
}

interface RenewSystemLicenseKeyBody {
  days: 30 | 60 | 90;
}

const ALLOWED_DAYS = new Set([30, 60, 90]);

export async function handler(
  request: FastifyRequest<{
    Params: RenewSystemLicenseKeyParams;
    Body: RenewSystemLicenseKeyBody;
  }>,
  reply: FastifyReply,
) {
  const caller = request.user as { userId: string; role: UserRole | null };
  const { keyId } = request.params;
  const days = Number(request.body?.days);

  const isAdminOrMod = caller.role === UserRole.admin || caller.role === UserRole.mod;
  const isAgency = caller.role === UserRole.agency;
  if (!isAdminOrMod && !isAgency) {
    return reply.status(403).send({
      success: false,
      message: 'Only admin/mod/agency can renew license keys.',
    });
  }

  if (!ALLOWED_DAYS.has(days)) {
    return reply.status(400).send({
      success: false,
      message: 'days must be one of 30, 60, or 90',
    });
  }

  const key = await getPortalLicenseById(keyId);

  if (isAgency && key.seller_user_id !== caller.userId) {
    return reply.status(403).send({
      success: false,
      message: 'You can only renew keys in your own whitelabel.',
    });
  }

  const now = new Date();
  const currentExpiresAt = key.expires_at ? new Date(key.expires_at) : null;
  const base =
    currentExpiresAt && currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);

  await renewPortalLicense(keyId, next.toISOString());

  return reply.send({
    success: true,
    data: {
      core_license_key_id: keyId,
      renewed_days: days,
      previous_expires_at: key.expires_at,
      new_expires_at: next.toISOString(),
    },
  });
}
