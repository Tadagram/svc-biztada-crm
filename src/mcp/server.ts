import { executeDynamicAPI } from '../services/apiDispatcherClient';
import { McpToolCallRequest, McpToolCallResponse, getMcpToolsRegistry } from './registry';

const AI_CONTROLLER_URL = process.env.AI_CONTROLLER_URL || 'http://svc-ai-controller.tadagram.svc.cluster.local:3100';

export class McpServer {
  public async getTools(authHeader?: string, prisma?: any) {
    return await getMcpToolsRegistry(authHeader, prisma);
  }

  public async callTool(
    authHeader: string,
    request: McpToolCallRequest,
    prisma?: any,
    businessId?: string,
  ): Promise<McpToolCallResponse> {
    const { name, arguments: args } = request;

    try {
      let result: any;
      
      const res = await fetch(`${AI_CONTROLLER_URL}/api/v1/strategy/capabilities?name=${name}`, {
        headers: { authorization: authHeader || '' },
      });
      
      let dbTool = null;
      if (res.ok) {
        const data = await res.json();
        const caps = data.data || [];
        dbTool = caps.find((c: any) => c.capability_id === name || c.name === name);
      }

      if (dbTool && dbTool.is_active !== false) {
        let resolvedEndpoint = dbTool.endpoint;
        if (args) {
          Object.keys(args).forEach((key) => {
            resolvedEndpoint = resolvedEndpoint.replace(`{${key}}`, String(args[key]));
          });
        }

        result = await executeDynamicAPI(
          authHeader,
          dbTool.service,
          dbTool.http_method,
          resolvedEndpoint,
          args,
          businessId,
        );
      } else {
        return {
          content: [{ type: 'text', text: `Tool ${name} not found or inactive in AI Controller` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'json',
            json: result || { success: true },
          },
        ],
      };
    } catch (error: any) {
      console.error(`[MCP] Error executing tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
}

export const mcpServer = new McpServer();
