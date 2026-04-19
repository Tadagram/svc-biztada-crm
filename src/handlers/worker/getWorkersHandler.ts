import { FastifyRequest, FastifyReply } from 'fastify';

interface GetWorkersQuerystring {
  limit?: number;
  offset?: number;
  portal_id?: string;
  user_id?: string;
  worker_type?: string;
  search?: string;
}

// Shape returned by orchestrator GET /api/admin/workers
interface OrchestratorWorker {
  worker_uuid: string;
  worker_type: string;
  worker_mode: string;
  ip_type: string;
  user_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // live (null = offline)
  status: string | null;
  last_heartbeat: string | null;
  url: string | null;
}

// Shape returned by svc-core-api GET /internal/portals/workers
interface PortalWorkerRow {
  portal_id: string;
  device_name: string;
  portal_type: string;
  portal_status: string;
  user_id: string;
  worker_row_id: string | null;
  worker_uuid: string | null;
  worker_type: string | null;
  installed_at: string | null;
  last_seen_at: string | null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: GetWorkersQuerystring }>,
  reply: FastifyReply,
) {
  const {
    limit: queryLimit = 20,
    offset: queryOffset = 0,
    portal_id,
    user_id,
    worker_type,
    search,
  } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

  const coreApiUrl = process.env.CORE_API_URL ?? '';
  const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? '';

  try {
    // 1. Fetch portal+worker mapping from svc-core-api
    const coreParams = new URLSearchParams();
    if (portal_id) coreParams.set('portal_id', portal_id);
    if (user_id) coreParams.set('user_id', user_id);
    if (worker_type) coreParams.set('worker_type', worker_type);

    const [coreRes, orchRes] = await Promise.all([
      fetch(`${coreApiUrl}/internal/portals/workers?${coreParams.toString()}`),
      fetch(`${orchestratorUrl}/api/admin/workers`),
    ]);

    if (!coreRes.ok) {
      const text = await coreRes.text();
      request.log.error(
        { status: coreRes.status, body: text },
        'svc-core-api /internal/portals/workers failed',
      );
      return reply
        .status(502)
        .send({ success: false, message: 'Failed to fetch portal data from core API' });
    }
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

    const coreBody = (await coreRes.json()) as { success: boolean; data: PortalWorkerRow[] };
    const orchBody = (await orchRes.json()) as { data: OrchestratorWorker[]; total: number };

    const portalRows: PortalWorkerRow[] = coreBody.data ?? [];
    const orchWorkers: OrchestratorWorker[] = orchBody.data ?? [];

    // Build a lookup map: worker_uuid → orchestrator data
    const orchMap = new Map<string, OrchestratorWorker>();
    for (const w of orchWorkers) {
      orchMap.set(w.worker_uuid, w);
    }

    // Merge: one result row per portal_installed_workers row that has a worker_uuid
    // Include portals without workers too (worker_uuid = null rows)
    let merged = portalRows.map((row) => {
      const orch = row.worker_uuid ? orchMap.get(row.worker_uuid) : undefined;
      return {
        // portal info
        portal_id: row.portal_id,
        device_name: row.device_name,
        portal_type: row.portal_type,
        portal_status: row.portal_status,
        user_id: row.user_id,
        // worker info from svc-core-api
        worker_uuid: row.worker_uuid ?? null,
        worker_type: row.worker_type ?? orch?.worker_type ?? null,
        installed_at: row.installed_at ?? null,
        last_seen_at: row.last_seen_at ?? null,
        // live enrichment from orchestrator
        status: orch?.status ?? null,
        worker_mode: orch?.worker_mode ?? null,
        ip_type: orch?.ip_type ?? null,
        last_heartbeat: orch?.last_heartbeat ?? null,
        expires_at: orch?.expires_at ?? null,
        registered_at: orch?.created_at ?? null,
      };
    });

    // Optional search filter (device name or worker_uuid)
    if (search) {
      const q = search.toLowerCase();
      merged = merged.filter(
        (r) =>
          r.device_name?.toLowerCase().includes(q) ||
          r.worker_uuid?.toLowerCase().includes(q) ||
          r.worker_type?.toLowerCase().includes(q),
      );
    }

    const total = merged.length;
    const page = merged.slice(offset, offset + limit);

    return reply.send({
      success: true,
      data: page,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
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
