import { FastifyRequest, FastifyReply } from 'fastify';
import topupEmitter, { ITopUpEvent } from '@plugins/topupEmitter';

/**
 * SSE endpoint — reviewer connects here to receive real-time top-up events.
 *
 * Events sent:
 *   new_topup       — a customer submitted a new request
 *   topup_approved  — a request was approved
 *   topup_rejected  — a request was rejected
 *
 * Format: `data: <JSON>\n\n`
 *
 * Client usage:
 *   const es = new EventSource('/topup/stream', { headers: { Authorization: 'Bearer ...' } })
 *   es.onmessage = (e) => console.log(JSON.parse(e.data))
 */
export async function streamTopUpHandler(request: FastifyRequest, reply: FastifyReply) {
  const res = reply.raw;

  // @fastify/cors onSend hook never fires because we call res.flushHeaders() below
  // before Fastify's response lifecycle runs — so we must set CORS headers manually.
  const requestOrigin = request.headers.origin;
  const allowedOrigin = process.env.FRONTEND_URL;
  if (requestOrigin && (requestOrigin === allowedOrigin || !allowedOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Send a comment immediately so client knows connection is alive
  res.write(': connected\n\n');

  // Keep-alive ping every 25s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 25_000);

  const handler = (data: ITopUpEvent) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  topupEmitter.on('topup_event', handler);

  // Cleanup when client disconnects
  request.raw.on('close', () => {
    clearInterval(keepAlive);
    topupEmitter.off('topup_event', handler);
    request.log.info({ userId: request.user.userId }, 'SSE client disconnected');
  });

  // Fastify must not auto-close the response
  return reply;
}
