import { FastifyRequest, FastifyReply } from 'fastify';
import topupEmitter, { ITopUpEvent } from '@plugins/topupEmitter';

function setCORSHeaders(res: any, requestOrigin?: string): void {
  const corsOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const fallbackOrigin = process.env.FRONTEND_URL;

  const isAllowed =
    corsOrigins.length === 0
      ? !fallbackOrigin || requestOrigin === fallbackOrigin
      : requestOrigin
        ? corsOrigins.includes(requestOrigin)
        : false;

  if (requestOrigin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

function setSSEHeaders(res: any): void {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
}

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const res = reply.raw;

  setCORSHeaders(res, request.headers.origin);
  setSSEHeaders(res);
  res.flushHeaders();

  res.write(': connected\n\n');

  const keepAlive = setInterval(() => {
    res.write('event: keep-alive\ndata: {}\n\n');
  }, 25_000);

  const handler = (data: ITopUpEvent) => {
    res.write(`event: topup_event\ndata: ${JSON.stringify(data)}\n\n`);
  };

  topupEmitter.on('topup_event', handler);

  request.raw.on('close', () => {
    clearInterval(keepAlive);
    topupEmitter.off('topup_event', handler);
    request.log.info({ userId: request.user.userId }, 'SSE client disconnected');
  });

  return reply;
}
