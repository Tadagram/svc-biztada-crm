const CORE_API_URL =
  process.env.CORE_API_URL ?? 'http://svc-core-api.tadagram.svc.cluster.local:3000';
const INTERNAL_PORTAL_LICENSES_TOKEN = process.env.INTERNAL_PORTAL_LICENSES_TOKEN ?? '';

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

export async function updateUserSubscription(
  userId: string,
  payload: { subscription_tier: string; subscription_expires_at: string | null },
): Promise<void> {
  const response = await fetch(
    `${CORE_API_URL}/internal/users/${encodeURIComponent(userId)}/subscription`,
    {
      method: 'PUT',
      headers: getInternalHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    const body = await parseJsonSafely<{ error?: { message?: string }; message?: string }>(
      response,
    );
    throw new Error(
      body?.error?.message ??
        body?.message ??
        `Update subscription failed with status ${response.status}`,
    );
  }
}
