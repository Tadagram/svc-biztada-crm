import { FastifyRequest, FastifyReply } from 'fastify';

interface ToolBody {
  tool_id?: string;
  name: string;
  description: string;
  api_endpoint: string;
  api_method: string;
  payload_schema?: any;
  is_active?: boolean;
}

interface KnowledgeBody {
  knowledge_id?: string;
  category: string;
  title: string;
  content: string;
  is_active?: boolean;
}

// Tạm thời hardcode cho việc testing nếu không có auth, nhưng thực tế sẽ lấy từ request.user
// UPDATE: AI Tools & Knowledge are GLOBAL data shared across the platform.
function getBusinessId(request: FastifyRequest): string {
  return 'GLOBAL';
}

/**
 * Lưu / Cập nhật Tool vào MySQL
 */
export async function upsertToolHandler(
  request: FastifyRequest<{ Body: ToolBody }>,
  reply: FastifyReply,
): Promise<void> {
  const businessId = getBusinessId(request);
  const data = request.body;

  try {
    const tool = await request.prisma.aiToolRegistry.upsert({
      where: { tool_id: data.tool_id || '' },
      create: {
        business_id: businessId,
        name: data.name,
        description: data.description,
        api_endpoint: data.api_endpoint,
        api_method: data.api_method,
        payload_schema: data.payload_schema || {},
        is_active: data.is_active ?? true,
      },
      update: {
        name: data.name,
        description: data.description,
        api_endpoint: data.api_endpoint,
        api_method: data.api_method,
        payload_schema: data.payload_schema || {},
        is_active: data.is_active ?? true,
      },
    });

    reply.send({ data: tool });
  } catch (err) {
    request.log.error(err, '[aiLibrary] failed to upsert tool');
    reply.status(500).send({ error: 'Failed to upsert tool' });
  }
}

/**
 * Liệt kê Tools của Business
 */
export async function listToolsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const businessId = getBusinessId(request);

  try {
    const tools = await request.prisma.aiToolRegistry.findMany({
      where: { business_id: businessId },
      orderBy: { updated_at: 'desc' },
    });
    reply.send({ data: tools });
  } catch (err) {
    request.log.error(err, '[aiLibrary] failed to list tools');
    reply.status(500).send({ error: 'Failed to list tools' });
  }
}

/**
 * Xóa Tool
 */
export async function deleteToolHandler(
  request: FastifyRequest<{ Params: { toolId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const businessId = getBusinessId(request);
  const { toolId } = request.params;

  try {
    await request.prisma.aiToolRegistry.deleteMany({
      where: { tool_id: toolId, business_id: businessId },
    });
    reply.send({ message: 'Deleted' });
  } catch (err) {
    request.log.error(err, '[aiLibrary] failed to delete tool');
    reply.status(500).send({ error: 'Failed to delete tool' });
  }
}

/**
 * Lưu / Cập nhật Knowledge vào MySQL
 */
export async function upsertKnowledgeHandler(
  request: FastifyRequest<{ Body: KnowledgeBody }>,
  reply: FastifyReply,
): Promise<void> {
  const businessId = getBusinessId(request);
  const data = request.body;

  try {
    const knowledge = await request.prisma.aiSkillKnowledge.upsert({
      where: { knowledge_id: data.knowledge_id || '' },
      create: {
        business_id: businessId,
        category: data.category,
        title: data.title,
        content: data.content,
        is_active: data.is_active ?? true,
      },
      update: {
        category: data.category,
        title: data.title,
        content: data.content,
        is_active: data.is_active ?? true,
      },
    });

    reply.send({ data: knowledge });
  } catch (err) {
    request.log.error(err, '[aiLibrary] failed to upsert knowledge');
    reply.status(500).send({ error: 'Failed to upsert knowledge' });
  }
}

/**
 * Liệt kê Knowledge
 */
export async function listKnowledgeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const businessId = getBusinessId(request);

  try {
    const knowledge = await request.prisma.aiSkillKnowledge.findMany({
      where: { business_id: businessId },
      orderBy: { updated_at: 'desc' },
    });
    reply.send({ data: knowledge });
  } catch (err) {
    request.log.error(err, '[aiLibrary] failed to list knowledge');
    reply.status(500).send({ error: 'Failed to list knowledge' });
  }
}

/**
 * Xóa Knowledge
 */
export async function deleteKnowledgeHandler(
  request: FastifyRequest<{ Params: { knowledgeId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const businessId = getBusinessId(request);
  const { knowledgeId } = request.params;

  try {
    await request.prisma.aiSkillKnowledge.deleteMany({
      where: { knowledge_id: knowledgeId, business_id: businessId },
    });
    reply.send({ message: 'Deleted' });
  } catch (err) {
    request.log.error(err, '[aiLibrary] failed to delete knowledge');
    reply.status(500).send({ error: 'Failed to delete knowledge' });
  }
}
