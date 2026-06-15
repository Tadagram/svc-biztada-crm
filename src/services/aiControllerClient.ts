/**
 * aiControllerClient.ts
 *
 * Service-to-service client for svc-ai-controller.
 * Signs short-lived Worker JWTs (HS256) and submits text2text tasks,
 * then polls the assigned worker until the result arrives.
 *
 * Used by the strategy AI generation endpoint so that guest users on
 * strategy.biztada.com can trigger AI generation without a user JWT —
 * the CRM service authenticates on their behalf.
 */

import * as crypto from 'crypto';

// ── Environment config ───────────────────────────────────────────────────────

const AI_CONTROLLER_URL =
  process.env.AI_CONTROLLER_URL ?? 'http://svc-ai-controller.tadagram.svc.cluster.local:3100';

const AI_CONTROLLER_JWT_SECRET = process.env.AI_CONTROLLER_JWT_SECRET ?? '';

/** Worker identity presented to svc-ai-controller. */
const SERVICE_WORKER_UUID = 'svc-biztada-crm';
const SERVICE_WORKER_TYPE = 'crm'; // must NOT be "ai-controller" (blocked for loop prevention)

// ── Worker JWT (HS256) ───────────────────────────────────────────────────────

/**
 * Signs a short-lived Worker JWT using the shared JWT_SECRET_KEY that
 * svc-ai-controller uses for its DualAuthMiddleware.
 */
function signWorkerJwt(): string {
  if (!AI_CONTROLLER_JWT_SECRET) {
    throw new Error('AI_CONTROLLER_JWT_SECRET is not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      worker_uuid: SERVICE_WORKER_UUID,
      worker_type: SERVICE_WORKER_TYPE,
      iat: now,
      exp: now + 300, // 5 minutes
    }),
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', AI_CONTROLLER_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

// ── Task creation ────────────────────────────────────────────────────────────

interface TaskAssignment {
  task_id: string;
  worker_url: string;
}

export async function createTextTask(prompt: string): Promise<TaskAssignment> {
  const token = signWorkerJwt();

  const response = await fetch(`${AI_CONTROLLER_URL}/api/v1/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // Route to platform-hosted wkr-ai-controller workers only (mode=hosted portals).
      // This prevents strategy tasks from landing on customer-owned private workers.
      'X-Tadagram-Portal-Scope': 'hosted',
    },
    body: JSON.stringify({
      task_type: 'text.generate',
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      prompt,
      parameters: {
        input: { prompt, service: 'text2text' },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ai-controller task creation failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as Partial<TaskAssignment>;
  if (!data.task_id || !data.worker_url) {
    throw new Error(
      'ai-controller returned invalid task assignment (missing task_id or worker_url)',
    );
  }

  return data as TaskAssignment;
}

// ── Result polling ───────────────────────────────────────────────────────────

interface WorkerResultPayload {
  status?: string;
  text_result?: string;
  result_text?: string;
  text?: string;
  content?: string;
  message?: string;
  result?: Record<string, unknown>;
  choices?: Array<{ message?: { content?: string } }>;
}

function extractText(payload: WorkerResultPayload): string {
  const keys: Array<keyof WorkerResultPayload> = [
    'text_result',
    'result_text',
    'text',
    'content',
    'message',
  ];
  for (const key of keys) {
    const val = payload[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  if (payload.result && typeof payload.result === 'object') {
    return extractText(payload.result as WorkerResultPayload);
  }
  const first = payload.choices?.[0];
  if (typeof first?.message?.content === 'string' && first.message.content.trim()) {
    return first.message.content.trim();
  }
  return '';
}

export async function pollTextResult(taskId: string, timeoutMs = 180_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000));

    try {
      const token = signWorkerJwt();
      const res = await fetch(
        `${AI_CONTROLLER_URL}/api/v1/tasks/${encodeURIComponent(taskId)}/result`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            Connection: 'close',
          },
        },
      );

      if (res.status === 202) continue; // still processing
      if (res.status === 422) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(`AI task failed: ${body.error ?? 'unknown error'}`);
      }
      if (!res.ok) continue; // transient error — keep polling

      const data = (await res.json()) as WorkerResultPayload;
      const text = extractText(data);
      if (text) return text;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('AI task failed')) throw err;
      // Network blip — keep polling
    }
  }

  throw new Error('AI generation timed out (80 s)');
}

// ── Convenience export ───────────────────────────────────────────────────────

/**
 * Full end-to-end: create task → poll → return text.
 * Caller should handle errors (502 to the client).
 */
export async function generateText(prompt: string): Promise<string> {
  const { task_id } = await createTextTask(prompt);
  return pollTextResult(task_id);
}

export async function createAssistantTextTask(prompt: string): Promise<TaskAssignment> {
  const token = signWorkerJwt();

  const response = await fetch(`${AI_CONTROLLER_URL}/api/v1/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Connection: 'close',
      // Route to platform-hosted wkr-ai-controller workers only (mode=hosted portals).
      // This prevents strategy tasks from landing on customer-owned private workers.
      'X-Tadagram-Portal-Scope': 'hosted',
    },
    body: JSON.stringify({
      task_type: 'text.generate',
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      prompt,
      parameters: {
        input: { prompt, service: 'text2text' },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ai-controller task creation failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as Partial<TaskAssignment>;
  if (!data.task_id || !data.worker_url) {
    throw new Error(
      'ai-controller returned invalid task assignment (missing task_id or worker_url)',
    );
  }

  return data as TaskAssignment;
}

export async function generateAssistantText(prompt: string): Promise<string> {
  const { task_id } = await createAssistantTextTask(prompt);
  return pollTextResult(task_id);
}
