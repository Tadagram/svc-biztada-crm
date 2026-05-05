import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { listPortalWorkers } from '@services/corePortalWorkers';
import { USER_ROLES } from '@/utils/constants';

interface GetWorkersQuerystring {
  limit?: number;
  offset?: number;
  worker_type?: string;
  worker_mode?: string;
  status?: string;
  user_id?: string;
  portal_user_id?: string;
  portal_id?: string;
  search?: string;
}

interface OrchestratorWorker {
  worker_uuid: string;
  worker_type: string;
  worker_mode: string;
  ip_type: string;
  user_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  last_heartbeat: string | null;
  url: string | null;
}

interface EnrichedWorker extends OrchestratorWorker {
  portal_id: string | null;
  portal_owner_user_id: string | null;
  portal_device_name: string | null;
  portal_status: string | null;
  portal_last_seen_at: string | null;
  portal_online: boolean;
}

function isHeartbeatFresh(lastHeartbeat: string | null, maxAgeMs = 5 * 60_000): boolean {
  if (!lastHeartbeat) return false;
  const ts = new Date(lastHeartbeat).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const {
    limit: queryLimit = 20,
    offset: queryOffset = 0,
    worker_type,
    worker_mode,
    status,
    user_id,
    portal_user_id,
    portal_id,
    search,
  } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);
  const caller = request.user as { userId: string; role: UserRole | null };

  // --- Agency isolation: pre-fetch sub-user IDs ---
  let agencySubUserIds: Set<string> | null = null;
  if (caller.role === USER_ROLES.AGENCY) {
    const prisma = request.prisma as any;
    const subUsers = await prisma.users.findMany({
      where: { parent_user_id: caller.userId },
      select: { user_id: true },
    });
    agencySubUserIds = new Set(subUsers.map((u: any) => u.user_id as string));
    // Validate explicit user_id filter if provided
    if (user_id && !agencySubUserIds.has(user_id)) {
      return reply.status(403).send({ success: false, message: 'Access denied to this user' });
    }
  }

  const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? '';

  try {
    const orchRes = await fetch(`${orchestratorUrl}/api/admin/workers`);

    if (!orchRes.ok) {
      const text = await orchRes.text();
      request.log.error(
        { status: orchRes.status, body: text },
        'orchestrator /api/admin/workers failed',
      );
      return reply
        .status(502)
        .send({ success: false, message: 'Failed to fetch worker data from orchestrator' });
    }

    const orchBody = (await orchRes.json()) as { data: OrchestratorWorker[]; total: number };
    const workers: OrchestratorWorker[] = orchBody.data ?? [];

    let portalRows = [] as Awaited<ReturnType<typeof listPortalWorkers>>;
    try {
      portalRows = await listPortalWorkers({
        userId: portal_user_id,
        portalId: portal_id,
        workerType: worker_type,
      });
    } catch (error) {
      request.log.warn({ err: error }, 'Failed to enrich workers with portal mapping');
    }

    const portalByWorkerUUID = new Map(
      portalRows.filter((row) => row.worker_uuid).map((row) => [row.worker_uuid as string, row]),
    );

    let enrichedWorkers: EnrichedWorker[] = workers.map((worker) => {
      const portal = portalByWorkerUUID.get(worker.worker_uuid);
      const workerOnline = worker.status === 'active' && isHeartbeatFresh(worker.last_heartbeat);
      const portalOnlineByPortalHeartbeat =
        portal?.portal_status === 'active' &&
        isHeartbeatFresh(portal?.last_seen_at ?? null, 10 * 60_000);

      return {
        ...worker,
        portal_id: portal?.portal_id ?? null,
        portal_owner_user_id: portal?.user_id ?? null,
        portal_device_name: portal?.device_name ?? null,
        portal_status: portal?.portal_status ?? null,
        portal_last_seen_at: portal?.last_seen_at ?? null,
        portal_online: workerOnline || portalOnlineByPortalHeartbeat,
      };
    });

    if (worker_type) enrichedWorkers = enrichedWorkers.filter((w) => w.worker_type === worker_type);
    if (worker_mode) enrichedWorkers = enrichedWorkers.filter((w) => w.worker_mode === worker_mode);
    if (status === 'active') enrichedWorkers = enrichedWorkers.filter((w) => w.status === 'active');
    else if (status === 'offline')
      enrichedWorkers = enrichedWorkers.filter((w) => !w.status || w.status !== 'active');
    if (user_id) enrichedWorkers = enrichedWorkers.filter((w) => w.user_id === user_id);
    if (portal_user_id)
      enrichedWorkers = enrichedWorkers.filter((w) => w.portal_owner_user_id === portal_user_id);
    if (portal_id) enrichedWorkers = enrichedWorkers.filter((w) => w.portal_id === portal_id);
    // Enforce agency isolation: only show workers for portals owned by sub-users
    if (agencySubUserIds) {
      enrichedWorkers = enrichedWorkers.filter(
        (w) => w.portal_owner_user_id !== null && agencySubUserIds!.has(w.portal_owner_user_id),
      );
    }

    if (search) {
      const q = search.toLowerCase();
      enrichedWorkers = enrichedWorkers.filter(
        (w) =>
          w.worker_uuid.toLowerCase().includes(q) ||
          w.worker_type.toLowerCase().includes(q) ||
          w.worker_mode.toLowerCase().includes(q) ||
          (w.user_id ?? '').toLowerCase().includes(q) ||
          (w.portal_id ?? '').toLowerCase().includes(q) ||
          (w.portal_owner_user_id ?? '').toLowerCase().includes(q),
      );
    }

    const total = enrichedWorkers.length;
    const page = enrichedWorkers.slice(offset, offset + limit);

    return reply.send({
      success: true,
      data: page,
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch workers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
