import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { signWorkerJwt } from '../../services/aiControllerClient';

const AI_CONTROLLER_URL =
  process.env.AI_CONTROLLER_URL || 'http://svc-ai-controller.tadagram.svc.cluster.local:3100';

export default async function aiKnowledgeHandler(fastify: FastifyInstance) {
  // 1. Get List
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const qs = new URLSearchParams(request.query as any).toString();
      const token = signWorkerJwt();
      const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/knowledge?${qs}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return reply.status(res.status).send({ success: res.ok, data: data.data || data });
    } catch (error) {
      console.error('[AI_KNOWLEDGE] Error fetching list:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 2. Create
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = signWorkerJwt();
      const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request.body),
      });
      const data = await res.json();
      return reply.status(res.status).send({ success: res.ok, data: data.data || data });
    } catch (error) {
      console.error('[AI_KNOWLEDGE] Error creating:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 3. Update
  fastify.put(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const body = { ...(request.body as any), chunk_id: request.params.id };
        const token = signWorkerJwt();
        const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/knowledge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return reply.status(res.status).send({ success: res.ok, data: data.data || data });
      } catch (error) {
        console.error('[AI_KNOWLEDGE] Error updating:', error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );

  // 4. Delete
  fastify.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const token = signWorkerJwt();
        const res = await fetch(
          `${AI_CONTROLLER_URL}/api/v1/strategy/knowledge/${request.params.id}`,
          {
            method: 'DELETE',
            headers: { authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        return reply.status(res.status).send({ success: res.ok, data });
      } catch (error) {
        console.error('[AI_KNOWLEDGE] Error deleting:', error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );

  // 5. Query
  fastify.post('/query', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { category, search_keyword } = request.body as any;
      const token = signWorkerJwt();
      const res = await fetch(
        `${AI_CONTROLLER_URL}/api/v1/strategy/knowledge?category=${category || ''}`,
        {
          headers: { authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      let records = data.data || [];
      if (search_keyword) {
        const keyword = search_keyword.toLowerCase();
        records = records.filter(
          (r: any) =>
            (r.title && r.title.toLowerCase().includes(keyword)) ||
            (r.content && r.content.toLowerCase().includes(keyword)),
        );
      }
      return reply.status(res.status).send({ success: res.ok, data: records });
    } catch (error) {
      console.error('[AI_KNOWLEDGE] Error querying:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
