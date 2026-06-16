import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function aiToolsHandler(fastify: FastifyInstance) {
  // 1. Get List
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const records = await fastify.prisma.aiMcpTools.findMany({
        orderBy: { created_at: 'desc' },
      });
      return reply.send({ success: true, data: records });
    } catch (error) {
      console.error('[AI_TOOLS] Error fetching list:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 2. Create
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        name,
        display_name,
        description,
        service,
        action_type,
        http_method,
        endpoint,
        parameter_schema,
        is_active,
      } = request.body as any;

      if (!name || !description || !endpoint) {
        return reply.status(400).send({ success: false, error: 'Missing required fields' });
      }

      let parsedSchema = parameter_schema;
      if (typeof parameter_schema === 'string') {
        try {
          parsedSchema = JSON.parse(parameter_schema);
        } catch {
          parsedSchema = parameter_schema;
        }
      }

      const newRecord = await fastify.prisma.aiMcpTools.create({
        data: {
          name,
          display_name,
          description,
          service,
          action_type,
          http_method,
          endpoint,
          parameter_schema: parsedSchema,
          is_active: is_active !== undefined ? is_active : true,
        },
      });
      return reply.send({ success: true, data: newRecord });
    } catch (error) {
      console.error('[AI_TOOLS] Error creating:', error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // 3. Update
  fastify.put(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const {
          name,
          display_name,
          description,
          service,
          action_type,
          http_method,
          endpoint,
          parameter_schema,
          is_active,
        } = request.body as any;

        let parsedSchema = parameter_schema;
        if (typeof parameter_schema === 'string') {
          try {
            parsedSchema = JSON.parse(parameter_schema);
          } catch {
            parsedSchema = parameter_schema;
          }
        }

        const updatedRecord = await fastify.prisma.aiMcpTools.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(display_name && { display_name }),
            ...(description && { description }),
            ...(service && { service }),
            ...(action_type && { action_type }),
            ...(http_method && { http_method }),
            ...(endpoint && { endpoint }),
            ...(parameter_schema !== undefined && { parameter_schema: parsedSchema }),
            ...(is_active !== undefined && { is_active }),
          },
        });
        return reply.send({ success: true, data: updatedRecord });
      } catch (error) {
        console.error('[AI_TOOLS] Error updating:', error);
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
        await fastify.prisma.aiMcpTools.delete({
          where: { id },
        });
        return reply.send({ success: true });
      } catch (error) {
        console.error('[AI_TOOLS] Error deleting:', error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );
}
