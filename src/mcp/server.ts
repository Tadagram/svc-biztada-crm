import { executeDynamicAPI } from '../services/apiDispatcherClient';
import { McpToolCallRequest, McpToolCallResponse, getMcpToolsRegistry } from './registry';

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
      if (prisma) {
        const dbTool = await prisma.aiMcpTools.findUnique({ where: { name } });
        if (dbTool && dbTool.is_active) {
          result = await executeDynamicAPI(
            authHeader,
            dbTool.service,
            dbTool.http_method,
            dbTool.endpoint,
            args,
            businessId,
          );
        } else {
          return {
            content: [{ type: 'text', text: `Tool ${name} not found or inactive in Database` }],
            isError: true,
          };
        }
      } else {
        return {
          content: [
            { type: 'text', text: `Prisma client not provided. Cannot lookup Tool ${name}` },
          ],
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
