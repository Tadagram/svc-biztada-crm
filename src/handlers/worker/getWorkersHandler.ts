import { FastifyRequest, FastifyReply } from 'fastify';

interface GetWorkersQuerystring {
  limit?: number;
  offset?: number;
  worker_type?: string;
  worker_mode?: string;
  status?: string;
  user_id?: string;
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
    search,
  } = request.query;
  const limit = Number(queryLimit);
  const offset = Number(queryOffset);

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
    let workers: OrchestratorWorker[] = orchBody.data ?? [];

    if (worker_type) workers = workers.filter((w) => w.worker_type === worker_type);
    if (worker_mode) workers = workers.filter((w) => w.worker_mode === worker_mode);
    if (status === 'active') workers = workers.filter((w) => w.status === 'active');
    else if (status === 'offline')
      workers = workers.filter((w) => !w.status || w.status !== 'active');
    if (user_id) workers = workers.filter((w) => w.user_id === user_id);
    if (search) {
      const q = search.toLowerCase();
      workers = workers.filter(
        (w) =>
          w.worker_uuid.toLowerCase().includes(q) ||
          w.worker_type.toLowerCase().includes(q) ||
          w.worker_mode.toLowerCase().includes(q) ||
          (w.user_id ?? '').toLowerCase().includes(q),
      );
    }

    const total = workers.length;
    const page = workers.slice(offset, offset + limit);

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
