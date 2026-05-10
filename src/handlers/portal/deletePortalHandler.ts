import { FastifyRequest, FastifyReply } from 'fastify';
import { adminDeletePortalDevice } from '@services/corePortalDevices';

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
  const caller = request.user as { userId: string };

  if (!id || !id.trim()) {
    return reply.status(400).send({
      success: false,
      message: 'Portal ID is required',
    });
  }

  try {
    const result = await adminDeletePortalDevice(id);

    const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? '';
    if (orchestratorUrl && Array.isArray(result.deleted_worker_uuids)) {
      await Promise.all(
        result.deleted_worker_uuids.map(async (workerUuid) => {
          if (!workerUuid) return;
          try {
            const response = await fetch(`${orchestratorUrl}/api/worker/unregister`, {
              method: 'POST',
              headers: {
                'X-Worker-Id': workerUuid,
              },
              signal: AbortSignal.timeout(5_000),
            });

            if (!response.ok) {
              const text = await response.text();
              request.log.warn(
                {
                  workerUuid,
                  status: response.status,
                  body: text,
                },
                'Failed to unregister worker from orchestrator after portal delete',
              );
            }
          } catch (error) {
            request.log.warn(
              { workerUuid, err: error },
              'Error when unregistering worker from orchestrator after portal delete',
            );
          }
        }),
      );
    }

    request.log.info(
      {
        portalId: id,
        userId: caller.userId,
        deletedWorkers: result.deleted_workers,
        deletedWorkerUuids: result.deleted_worker_uuids ?? [],
        detachedLicenseKeyId: result.detached_license_key_id ?? null,
      },
      'Portal hard-deleted with cleanup successfully',
    );

    return reply.send({
      success: true,
      message: 'Portal deleted successfully',
      data: result,
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
