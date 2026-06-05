const MARKETING_API_URL =
  process.env.SVC_BUSINESS_MARKETING_URL ?? 'http://svc-business-marketing:8080';

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Calls an endpoint on svc-business-marketing acting as the user.
 * @param path The API path starting with / (e.g. /api/v1/dashboard/activity)
 * @param authHeader The original Authorization header (Bearer <token>)
 */
export async function fetchMarketingData(path: string, authHeader: string): Promise<any> {
  if (!authHeader) {
    throw new Error('Missing Authorization header for marketing API call');
  }

  const url = `${MARKETING_API_URL}${path}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    signal: AbortSignal.timeout(15_000),
  });

  const body = await parseJsonSafely<any>(response as any);
  if (!response.ok) {
    throw new Error(`Marketing API request failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

export async function getMarketingDashboard(authHeader: string): Promise<any> {
  return fetchMarketingData('/api/v1/dashboard', authHeader);
}

export async function getWorkerStats(authHeader: string): Promise<any> {
  return fetchMarketingData('/api/v1/my-workers/stats', authHeader);
}

export async function getActiveWorkflows(authHeader: string): Promise<any> {
  return fetchMarketingData('/api/v1/workflows', authHeader);
}

export async function getDashboardActivity(authHeader: string): Promise<any> {
  return fetchMarketingData('/api/v1/dashboard/activity', authHeader);
}

export async function executeDynamicAPI(
  authHeader: string,
  method: string,
  endpoint: string,
  payload?: any,
): Promise<any> {
  if (!authHeader) {
    throw new Error('Missing Authorization header for marketing API call');
  }

  const url = `${MARKETING_API_URL}${endpoint}`;

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    signal: AbortSignal.timeout(20_000),
  };

  if (payload && ['POST', 'PUT', 'PATCH'].includes(options.method as string)) {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);
  const body = await parseJsonSafely<any>(response as any);

  if (!response.ok) {
    throw new Error(
      `API ${method} ${endpoint} failed (${response.status}): ${JSON.stringify(body || response.statusText)}`,
    );
  }

  return body;
}
