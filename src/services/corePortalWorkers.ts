const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';

export interface CorePortalWorkerItem {
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

interface CorePortalWorkersResponse {
  success: boolean;
  data: CorePortalWorkerItem[];
  total: number;
  message?: string;
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function listPortalWorkers(params: {
  portalId?: string;
  userId?: string;
  workerType?: string;
}): Promise<CorePortalWorkerItem[]> {
  const query = new URLSearchParams();
  if (params.portalId) query.set('portal_id', params.portalId);
  if (params.userId) query.set('user_id', params.userId);
  if (params.workerType) query.set('worker_type', params.workerType);

  const url = `${CORE_API_URL}/internal/portals/workers${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(15_000),
  });

  const body = await parseJsonSafely<CorePortalWorkersResponse>(response);
  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? `List portal workers failed with status ${response.status}`);
  }

  return body.data ?? [];
}
