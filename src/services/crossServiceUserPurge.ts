export interface PurgeTargetResult {
  service: string;
  attempted: boolean;
  success: boolean;
  status?: number;
  message?: string;
}

export interface CrossServicePurgeReport {
  allSucceeded: boolean;
  results: PurgeTargetResult[];
}

type PurgeTarget = {
  service: string;
  baseUrl: string | undefined;
};

function buildTargets(): PurgeTarget[] {
  return [
    {
      service: 'svc-core-api',
      baseUrl: process.env.CORE_API_URL,
    },
    {
      service: 'svc-business-marketing',
      baseUrl: process.env.SVC_BUSINESS_MARKETING_URL,
    },
    {
      service: 'svc-business-chatbot',
      baseUrl: process.env.SVC_BUSINESS_CHATBOT_URL,
    },
    {
      service: 'svc-business-crm',
      baseUrl: process.env.SVC_BUSINESS_CRM_URL,
    },
  ];
}

function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? '').trim().replace(/\/$/, '');
}

async function parseJsonSafely(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function purgeUserAcrossServices(userId: string): Promise<CrossServicePurgeReport> {
  const targets = buildTargets();
  const internalToken = (process.env.INTERNAL_PURGE_TOKEN ?? '').trim();

  const results = await Promise.all(
    targets.map(async (target): Promise<PurgeTargetResult> => {
      const baseUrl = normalizeBaseUrl(target.baseUrl);
      if (!baseUrl) {
        return {
          service: target.service,
          attempted: false,
          success: true,
          message: 'skipped: base URL not configured',
        };
      }

      const url = `${baseUrl}/internal/users/${encodeURIComponent(userId)}/purge`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (internalToken) {
        headers['X-Internal-Token'] = internalToken;
      }

      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers,
          signal: AbortSignal.timeout(20_000),
        });

        if (response.ok) {
          return {
            service: target.service,
            attempted: true,
            success: true,
            status: response.status,
          };
        }

        const payload = await parseJsonSafely(response);
        return {
          service: target.service,
          attempted: true,
          success: false,
          status: response.status,
          message:
            (payload?.message as string | undefined) ??
            (payload?.error as string | undefined) ??
            `HTTP ${response.status}`,
        };
      } catch (error) {
        return {
          service: target.service,
          attempted: true,
          success: false,
          message: error instanceof Error ? error.message : 'request failed',
        };
      }
    }),
  );

  return {
    allSucceeded: results.every((result) => result.success),
    results,
  };
}
