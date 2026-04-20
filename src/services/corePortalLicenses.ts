const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';
const INTERNAL_PORTAL_LICENSES_TOKEN = process.env.INTERNAL_PORTAL_LICENSES_TOKEN ?? '';

export interface CorePortalLicenseItem {
  id: string;
  license_key: string;
  expires_at: string | null;
  issued_for_note: string | null;
  issued_for_portal_id: string | null;
  used_by_portal_id: string | null;
  activated_at: string | null;
  buyer_user_id: string | null;
  seller_user_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface CorePortalLicenseListResponse {
  success: boolean;
  data: CorePortalLicenseItem[];
  total: number;
  page: number;
  page_size: number;
}

interface CorePortalLicenseBatchIssueRequest {
  buyer_user_id: string;
  seller_user_id?: string;
  expires_at: string;
  issued_for_note: string;
  quantity: number;
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getInternalHeaders() {
  if (!INTERNAL_PORTAL_LICENSES_TOKEN) {
    throw new Error('INTERNAL_PORTAL_LICENSES_TOKEN is not configured');
  }

  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL_PORTAL_LICENSES_TOKEN,
  } as const;
}

export async function issuePortalLicensesBatch(
  payload: CorePortalLicenseBatchIssueRequest,
): Promise<void> {
  const response = await fetch(`${CORE_API_URL}/internal/portal-licenses/bulk-issue`, {
    method: 'POST',
    headers: getInternalHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const body = await parseJsonSafely<{ error?: { message?: string }; message?: string }>(
      response,
    );
    throw new Error(
      body?.error?.message ?? body?.message ?? `Bulk issue failed with status ${response.status}`,
    );
  }
}

export async function listPortalLicensesByBuyer(params: {
  buyerUserId: string;
  page: number;
  pageSize: number;
}): Promise<CorePortalLicenseListResponse> {
  const search = new URLSearchParams({
    buyer_user_id: params.buyerUserId,
    page: String(params.page),
    page_size: String(params.pageSize),
  });

  const response = await fetch(`${CORE_API_URL}/internal/portal-licenses?${search.toString()}`, {
    method: 'GET',
    headers: getInternalHeaders(),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await parseJsonSafely<CorePortalLicenseListResponse & { message?: string }>(
    response,
  );
  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? `List buyer licenses failed with status ${response.status}`);
  }

  return body;
}
