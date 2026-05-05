import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import {
  adminTransferPortalDevice,
  type TransferPortalDeviceRequest,
} from '@services/corePortalDevices';
import { USER_ROLES } from '@/utils/constants';

interface TransferPortalBody {
  portal_id: string;
  new_mac_address: string;
  new_device_name?: string | null;
  clear_installed_workers?: boolean;
}

export async function handler(
  request: FastifyRequest<{ Body: TransferPortalBody }>,
  reply: FastifyReply,
) {
  const caller = request.user as { userId: string; role: UserRole | null };
  if (caller.role === USER_ROLES.AGENCY) {
    return reply.status(403).send({ success: false, message: 'Permission denied' });
  }

  const { portal_id, new_mac_address, new_device_name, clear_installed_workers } = request.body;

  if (!portal_id || !new_mac_address) {
    return reply.status(400).send({
      success: false,
      message: 'portal_id and new_mac_address are required',
    });
  }

  const payload: TransferPortalDeviceRequest = {
    portal_id,
    new_mac_address,
    ...(new_device_name !== undefined && { new_device_name }),
    clear_installed_workers: clear_installed_workers ?? false,
  };

  try {
    const result = await adminTransferPortalDevice(payload);

    return reply.send({
      success: true,
      message:
        'Portal successfully transferred. The new machine will auto-activate on next startup.',
      data: result,
    });
  } catch (error) {
    request.log.error(error, 'transferPortalHandler: failed to transfer portal device');

    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    // Map well-known error codes from core-api to HTTP status codes.
    if (errMsg.includes('PORTAL_NOT_FOUND')) {
      return reply.status(404).send({ success: false, message: errMsg });
    }
    if (errMsg.includes('MAC_ALREADY_BOUND')) {
      return reply.status(409).send({ success: false, message: errMsg });
    }
    if (errMsg.includes('INVALID_PORTAL_ID')) {
      return reply.status(400).send({ success: false, message: errMsg });
    }

    return reply.status(500).send({
      success: false,
      message: 'Failed to transfer portal device',
      error: errMsg,
    });
  }
}
