import { executeDynamicAPI } from '../services/apiDispatcherClient';

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string | 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface McpToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface McpToolCallResponse {
  content: Array<{
    type: 'text' | 'json';
    text?: string;
    json?: any;
  }>;
  isError?: boolean;
}

export async function getMcpToolsRegistry(
  authHeader?: string,
  prisma?: any,
): Promise<McpToolSchema[]> {
  const registry: McpToolSchema[] = [];

  if (prisma) {
    try {
      const dbTools = await prisma.aiMcpTools.findMany({ where: { is_active: true } });
      for (const t of dbTools) {
        registry.push({
          name: t.name,
          description: t.description,
          inputSchema: (t.parameter_schema as any) || { type: 'object', properties: {} },
        });
      }
    } catch (e) {
      console.error('[MCP] Failed to fetch tools from DB', e);
    }
  }

  if (authHeader) {
    try {
      const result = await executeDynamicAPI(
        authHeader,
        'marketing',
        'GET',
        '/api/v1/workflows/node-registry',
      );
      if (result && result.nodes) {
        const nodesList = Object.values(result.nodes) as any[];
        const oneOfNodes = nodesList.map((n) => {
          const reqs = n.input_schema?.required || [];
          return {
            properties: { type: { const: n.type }, ...(n.input_schema?.properties || {}) },
            required: ['type', ...reqs],
          };
        });

        const workflowTool = registry.find((t) => t.name === 'marketing_create_workflow');
        if (workflowTool && workflowTool.inputSchema.properties.nodes) {
          (workflowTool.inputSchema.properties.nodes as any).items = { oneOf: oneOfNodes };
        }
      }
    } catch (e) {
      console.error('[MCP] Failed to sync dynamic nodes from marketing service', e);
    }
  }

  return registry;
}
