import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { USER_ROLES } from '@/utils/constants';

interface DeletePortalParams {
  id: string;
}

/**
 * deletePortalHandler — Remove a portal device.
 *
 * Route: DELETE /portals/:id
 * Auth: portals:manage (admin/mod only)
 *
 * For Agency: can only delete portals of their sub-users
 * For Admin/Mod: can delete any portal
 *
 * Returns: { success: true, message: string }
 */
export async function handler(
  request: FastifyRequest<{ Params: DeletePortalParams }>,
  reply: FastifyReply,
) {
  const { id } = request.params;
  const caller = request.user as { userId: string; role: UserRole | null };
  const prisma = request.prisma as any;

  if (!id || !id.trim()) {
    return reply.status(400).send({
      success: false,
      message: 'Portal ID is required',
    });
  }

  try {
    // Fetch portal to verify ownership
    const portalResponse = await fetch(
      `${process.env.CORE_API_URL || 'http://svc-core-api.tadagram.svc.cluster.local:3000'}/internal/worker-portal/admin/portals?page=1&limit=1&search=${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${request.headers.authorization?.replace('Bearer ', '') || ''}`,
        },
      },
    );

    if (!portalResponse.ok) {
      return reply.status(404).send({
        success: false,
        message: 'Portal not found',
      });
    }

    const portalData = await portalResponse.json();
    const portalItem = portalData.data?.[0];

    if (!portalItem) {
      return reply.status(404).send({
        success: false,
        message: 'Portal not found',
      });
    }

    // Permission check: Agency can only delete portals of their sub-users
    if (caller.role === USER_ROLES.AGENCY) {
      const subUser = await prisma.users.findUnique({
        where: { user_id: portalItem.user_id },
        select: { parent_user_id: true },
      });

      if (subUser?.parent_user_id !== caller.userId) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied: Portal belongs to another agency',
        });
      }
    }

    // Call core-api to delete portal (assuming there's a delete endpoint)
    // For now, we mark it as revoked instead of hard delete (safer)
    const deleteResponse = await fetch(
      `${process.env.CORE_API_URL || 'http://svc-core-api.tadagram.svc.cluster.local:3000'}/internal/worker-portal/${id}/revoke`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.headers.authorization?.replace('Bearer ', '') || ''}`,
        },
        body: JSON.stringify({}),
      },
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      request.log.error(
        { portalId: id, status: deleteResponse.status, error },
        'Failed to delete portal via core-api',
      );
      return reply.status(deleteResponse.status).send({
        success: false,
        message: 'Failed to delete portal',
      });
    }

    request.log.info(
      { portalId: id, userId: caller.userId },
      'Portal deleted/revoked successfully',
    );

    return reply.send({
      success: true,
      message: 'Portal deleted successfully',
    });
  } catch (error) {
    request.log.error(error, 'deletePortalHandler: error');
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
