import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { deletePortalLicenseKey, getPortalLicenseById } from '@services/corePortalLicenses';

interface DeleteSystemLicenseKeyParams {
  keyId: string;
}

export async function handler(
  request: FastifyRequest<{ Params: DeleteSystemLicenseKeyParams }>,
  reply: FastifyReply,
) {
  const caller = request.user as { userId: string; role: UserRole | null };
  const { keyId } = request.params;

  const isAdminOrMod = caller.role === UserRole.admin || caller.role === UserRole.mod;
  const isAgency = caller.role === UserRole.agency;
  if (!isAdminOrMod && !isAgency) {
    return reply.status(403).send({
      success: false,
      message: 'Only admin/mod/agency can delete license keys.',
    });
  }

  const key = await getPortalLicenseById(keyId);

  if (isAgency && key.seller_user_id !== caller.userId) {
    return reply.status(403).send({
      success: false,
      message: 'You can only delete keys in your own whitelabel.',
    });
  }

  await deletePortalLicenseKey(keyId);

  return reply.send({
    success: true,
    message: 'License key deleted',
    data: {
      core_license_key_id: keyId,
    },
  });
}
