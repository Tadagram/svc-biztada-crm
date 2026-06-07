import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { mcpServer } from '../mcp/server';

export default async function mcpRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.get('/tools', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const tools = await mcpServer.getTools(authHeader);
      return reply.send({ tools });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  fastify.post('/tools/call', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Unauthorized: Missing token' });
      }

      const body = request.body as any;
      if (!body.name || typeof body.arguments !== 'object') {
        return reply.status(400).send({ error: 'Invalid MCP tool call request' });
      }

      const response = await mcpServer.callTool(
        authHeader,
        {
          name: body.name,
          arguments: body.arguments,
        },
        request.server.prisma,
      );

      return reply.send(response);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
