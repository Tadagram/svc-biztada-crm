import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const AI_CONTROLLER_URL = process.env.AI_CONTROLLER_URL || 'http://svc-ai-controller.tadagram.svc.cluster.local:3100';

export default async function aiToolsHandler(fastify: FastifyInstance) {
  // 1. Get List
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const qs = new URLSearchParams(request.query as any).toString();
      const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/capabilities?${qs}`, {
        headers: { authorization: request.headers.authorization || '' },
      });
      const data = await res.json();
      return reply.status(res.status).send({ success: res.ok, data: data.data || data });
    } catch (error) {
      console.error('[AI_TOOLS] Error fetching list:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 2. Create
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/capabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: request.headers.authorization || '',
        },
        body: JSON.stringify(request.body),
      });
      const data = await res.json();
      return reply.status(res.status).send({ success: res.ok, data: data.data || data });
    } catch (error) {
      console.error('[AI_TOOLS] Error creating:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 3. Update
  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const body = { ...(request.body as any), capability_id: request.params.id };
      const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/capabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: request.headers.authorization || '',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return reply.status(res.status).send({ success: res.ok, data: data.data || data });
    } catch (error) {
      console.error('[AI_TOOLS] Error updating:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 4. Delete
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/capabilities/${request.params.id}`, {
        method: 'DELETE',
        headers: { authorization: request.headers.authorization || '' },
      });
      const data = await res.json();
      return reply.status(res.status).send({ success: res.ok, data });
    } catch (error) {
      console.error('[AI_TOOLS] Error deleting:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
