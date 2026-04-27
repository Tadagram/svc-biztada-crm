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

type CorePurgeMetadata = {
  business_ids: string[];
  telegram_id?: number;
};

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
  const internalToken =
    (process.env.INTERNAL_PURGE_TOKEN ?? '').trim() || (process.env.INTERNAL_TOKEN ?? '').trim();

  const coreTarget = targets.find((target) => target.service === 'svc-core-api');
  const otherTargets = targets.filter((target) => target.service !== 'svc-core-api');

  let coreMetadata: CorePurgeMetadata = { business_ids: [] };
  const coreResult: PurgeTargetResult = {
    service: 'svc-core-api',
    attempted: false,
    success: true,
    message: 'skipped: base URL not configured',
  };

  if (coreTarget) {
    const baseUrl = normalizeBaseUrl(coreTarget.baseUrl);
    if (baseUrl) {
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
          coreResult.attempted = true;
          coreResult.success = true;
          coreResult.status = response.status;

          const payload = await parseJsonSafely(response);
          const data = (payload?.data ?? {}) as Record<string, unknown>;
          const rawBusinessIDs = data.business_ids;
          const businessIDs = Array.isArray(rawBusinessIDs)
            ? rawBusinessIDs.filter((value): value is string => typeof value === 'string')
            : [];
          const telegramID = typeof data.telegram_id === 'number' ? data.telegram_id : undefined;

          coreMetadata = {
            business_ids: businessIDs,
            telegram_id: telegramID,
          };
        } else {
          const payload = await parseJsonSafely(response);
          coreResult.attempted = true;
          coreResult.success = false;
          coreResult.status = response.status;
          coreResult.message =
            (payload?.message as string | undefined) ??
            (payload?.error as string | undefined) ??
            `HTTP ${response.status}`;
        }
      } catch (error) {
        coreResult.attempted = true;
        coreResult.success = false;
        coreResult.message = error instanceof Error ? error.message : 'request failed';
      }
    }
  }

  const downstreamBody = {
    business_ids: coreMetadata.business_ids,
    telegram_id: coreMetadata.telegram_id,
  };

  const results = await Promise.all(
    otherTargets.map(async (target): Promise<PurgeTargetResult> => {
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
          body: JSON.stringify(downstreamBody),
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

  results.unshift(coreResult);

  return {
    allSucceeded: results.every((result) => result.success),
    results,
  };
}
