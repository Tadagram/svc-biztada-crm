/**
 * corePortalDevices.ts
 *
 * Service-to-service client: svc-biztada-crm → svc-core-api
 * Calls the admin portal device management endpoints on Core API.
 *
 * Auth: INTERNAL_PORTAL_LICENSES_TOKEN (same token reused; guards all /internal/* admin routes)
 */

const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';
const INTERNAL_PORTAL_LICENSES_TOKEN = process.env.INTERNAL_PORTAL_LICENSES_TOKEN ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorePortalDeviceItem {
  id: string;
  user_id: string;
  telegram_id: number;
  mac_address: string;
  device_name: string | null;
  status: 'pending' | 'active' | 'revoked';
  portal_type: 'public' | 'private';
  is_limited: boolean;
  license_key_id: string | null;
  license_expires_at: string | null;
  worker_version: string | null;
  last_seen_at: string | null;
  installed_workers: number;
  created_at: string;
  updated_at: string;
}

export interface CorePortalDeviceListResponse {
  success: boolean;
  data: CorePortalDeviceItem[];
  total: number;
  page: number;
  limit: number;
}

export interface TransferPortalDeviceRequest {
  portal_id: string;
  new_mac_address: string;
  new_device_name?: string | null;
  clear_installed_workers?: boolean;
}

export interface TransferPortalDeviceResult {
  portal_id: string;
  old_mac_address: string;
  new_mac_address: string;
  device_name: string;
  workers_cleared: boolean;
}

export interface CoreAdminPortalListParams {
  page?: number;
  limit?: number;
  user_id?: string;
  telegram_id?: number;
  status?: string;
  portal_type?: string;
  search?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getInternalHeaders(): Record<string, string> {
  if (!INTERNAL_PORTAL_LICENSES_TOKEN) {
    throw new Error('INTERNAL_PORTAL_LICENSES_TOKEN is not configured');
  }
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL_PORTAL_LICENSES_TOKEN,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /internal/worker-portal/admin/portals
 * Returns a paginated list of all portal devices with installed-worker counts.
 */
export async function adminListPortalDevices(
  params: CoreAdminPortalListParams = {},
): Promise<CorePortalDeviceListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.telegram_id) query.set('telegram_id', String(params.telegram_id));
  if (params.status) query.set('status', params.status);
  if (params.portal_type) query.set('portal_type', params.portal_type);
  if (params.search) query.set('search', params.search);

  const url = `${CORE_API_URL}/internal/worker-portal/admin/portals${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getInternalHeaders(),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await parseJsonSafely<CorePortalDeviceListResponse & { message?: string }>(response);
  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? `Admin list portals failed with status ${response.status}`);
  }
  return body;
}

/**
 * POST /internal/worker-portal/admin/transfer-device
 * Migrates a portal to a new physical machine (updates mac_address only).
 * All other portal data is preserved: license key, workers (unless cleared), portal_type, config.
 */
export async function adminTransferPortalDevice(
  payload: TransferPortalDeviceRequest,
): Promise<TransferPortalDeviceResult> {
  const response = await fetch(`${CORE_API_URL}/internal/worker-portal/admin/transfer-device`, {
    method: 'POST',
    headers: getInternalHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await parseJsonSafely<{
    success: boolean;
    data?: TransferPortalDeviceResult;
    message?: string;
    error?: string;
  }>(response);

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.message ?? body?.error ?? `Transfer device failed with status ${response.status}`,
    );
  }

  return body.data;
}
