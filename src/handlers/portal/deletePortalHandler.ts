import { FastifyRequest, FastifyReply } from 'fastify';
import { adminDeletePortalDevice } from '@services/corePortalDevices';

interface DeletePortalParams {
  id: string;
}

interface WorkerCleanupFailure {
  workerUuid: string;
  service: string;
  reason: string;
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
    const deletedWorkerUuids = Array.isArray(result.deleted_worker_uuids)
      ? result.deleted_worker_uuids.filter(Boolean)
      : [];

    const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? '';
    if (orchestratorUrl && deletedWorkerUuids.length > 0) {
      await Promise.all(
        deletedWorkerUuids.map(async (workerUuid) => {
          if (!workerUuid) return;
          try {
            // Hard-delete: removes worker from Redis + MongoDB persistent store
            const response = await fetch(
              `${orchestratorUrl}/api/worker/${encodeURIComponent(workerUuid)}/permanent`,
              {
                method: 'DELETE',
                signal: AbortSignal.timeout(5_000),
              },
            );

            if (!response.ok) {
              const text = await response.text();
              request.log.warn(
                {
                  workerUuid,
                  status: response.status,
                  body: text,
                },
                'Failed to permanently delete worker from orchestrator after portal delete',
              );
            }
          } catch (error) {
            request.log.warn(
              { workerUuid, err: error },
              'Error when permanently deleting worker from orchestrator after portal delete',
            );
          }
        }),
      );
    }

    const cleanupToken =
      (process.env.INTERNAL_PURGE_TOKEN ?? '').trim() || (process.env.INTERNAL_TOKEN ?? '').trim();
    const cleanupTargets = [
      {
        service: 'svc-business-marketing',
        baseUrl: (process.env.SVC_BUSINESS_MARKETING_URL ?? '').trim(),
      },
      {
        service: 'svc-business-chatbot',
        baseUrl: (process.env.SVC_BUSINESS_CHATBOT_URL ?? '').trim(),
      },
    ];

    const cleanupFailures: WorkerCleanupFailure[] = [];
    if (deletedWorkerUuids.length > 0) {
      for (const workerUuid of deletedWorkerUuids) {
        for (const target of cleanupTargets) {
          const normalizedBase = target.baseUrl.replace(/\/$/, '');
          if (!normalizedBase) {
            cleanupFailures.push({
              workerUuid,
              service: target.service,
              reason: 'base URL is not configured',
            });
            continue;
          }

          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (cleanupToken) {
              headers['X-Internal-Token'] = cleanupToken;
            }

            const response = await fetch(
              `${normalizedBase}/api/v1/internal/workers/${encodeURIComponent(workerUuid)}/purge`,
              {
                method: 'DELETE',
                headers,
                signal: AbortSignal.timeout(10_000),
              },
            );

            if (!response.ok) {
              const text = await response.text();
              cleanupFailures.push({
                workerUuid,
                service: target.service,
                reason: `HTTP ${response.status}: ${text}`,
              });
            }
          } catch (error) {
            cleanupFailures.push({
              workerUuid,
              service: target.service,
              reason: error instanceof Error ? error.message : 'request failed',
            });
          }
        }
      }
    }

    if (cleanupFailures.length > 0) {
      request.log.error(
        {
          portalId: id,
          cleanupFailures,
        },
        'Portal deleted but downstream worker cleanup failed',
      );

      return reply.status(502).send({
        success: false,
        message: 'Portal deleted but downstream worker cleanup failed',
        data: {
          portalDelete: result,
          cleanupFailures,
        },
      });
    }

    request.log.info(
      {
        portalId: id,
        userId: caller.userId,
        deletedWorkers: result.deleted_workers,
        deletedWorkerUuids,
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
