import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function aiKnowledgeHandler(fastify: FastifyInstance) {
  // 1. Get List
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const records = await fastify.prisma.aiKnowledgeBase.findMany({
        orderBy: { created_at: 'desc' },
      });
      return reply.send({ success: true, data: records });
    } catch (error) {
      console.error('[AI_KNOWLEDGE] Error fetching list:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 2. Create
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { category, title, content, keywords, is_active } = request.body as any;

      if (!category || !title || !content) {
        return reply.status(400).send({ success: false, error: 'Missing required fields' });
      }

      // Ensure content is parsed if string, or pass as object
      let parsedContent = content;
      if (typeof content === 'string') {
        try {
          parsedContent = JSON.parse(content);
        } catch {
          // If not valid JSON, just store as string inside JSON or leave as is if string is allowed
          parsedContent = content;
        }
      }

      let parsedKeywords = keywords || [];
      if (typeof keywords === 'string') {
        try {
          parsedKeywords = JSON.parse(keywords);
        } catch {
          parsedKeywords = [keywords];
        }
      }

      const newRecord = await fastify.prisma.aiKnowledgeBase.create({
        data: {
          category,
          title,
          content: parsedContent,
          keywords: parsedKeywords,
          is_active: is_active !== undefined ? is_active : true,
        },
      });
      return reply.send({ success: true, data: newRecord });
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
        const { id } = request.params;
        const { category, title, content, keywords, is_active } = request.body as any;

        let parsedContent = content;
        if (typeof content === 'string') {
          try {
            parsedContent = JSON.parse(content);
          } catch {
            parsedContent = content;
          }
        }

        let parsedKeywords = keywords;
        if (typeof keywords === 'string') {
          try {
            parsedKeywords = JSON.parse(keywords);
          } catch {
            parsedKeywords = [keywords];
          }
        }

        const updatedRecord = await fastify.prisma.aiKnowledgeBase.update({
          where: { id },
          data: {
            ...(category && { category }),
            ...(title && { title }),
            ...(content && { content: parsedContent }),
            ...(keywords && { keywords: parsedKeywords }),
            ...(is_active !== undefined && { is_active }),
          },
        });
        return reply.send({ success: true, data: updatedRecord });
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
        const { id } = request.params;
        await fastify.prisma.aiKnowledgeBase.delete({
          where: { id },
        });
        return reply.send({ success: true });
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

      if (!category) {
        return reply.status(400).send({ success: false, error: 'Missing category field' });
      }

      const records = await fastify.prisma.aiKnowledgeBase.findMany({
        where: {
          category: category,
          is_active: true,
        },
      });

      let result = records;
      if (search_keyword) {
        const keyword = search_keyword.toLowerCase();
        result = records.filter(
          (r: any) =>
            r.title.toLowerCase().includes(keyword) ||
            (r.content && JSON.stringify(r.content).toLowerCase().includes(keyword)) ||
            (r.keywords &&
              Array.isArray(r.keywords) &&
              r.keywords.some((k: string) => k.toLowerCase().includes(keyword))),
        );
      }

      return reply.send({ success: true, data: result });
    } catch (error) {
      console.error('[AI_KNOWLEDGE] Error querying:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
