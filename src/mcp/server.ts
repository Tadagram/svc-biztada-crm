import { executeDynamicAPI } from '../services/apiDispatcherClient';
import { McpToolCallRequest, McpToolCallResponse, getMcpToolsRegistry } from './registry';

export class McpServer {
  public getTools() {
    return getMcpToolsRegistry();
  }

  public async callTool(
    authHeader: string,
    request: McpToolCallRequest,
    prisma?: any,
  ): Promise<McpToolCallResponse> {
    const { name, arguments: args } = request;

    try {
      let result: any;

      switch (name) {
        // -- Marketing --
        case 'marketing_create_account':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/accounts',
            args,
          );
          break;
        case 'marketing_get_workflows':
          result = await executeDynamicAPI(authHeader, 'marketing', 'GET', '/api/v1/workflows');
          break;
        case 'marketing_create_workflow':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/workflows',
            args,
          );
          break;
        case 'marketing_run_workflow':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.workflow_id}/run-now`,
          );
          break;
        case 'marketing_get_nodes_schema':
          result = {
            nodes: {
              tiktok_scraper_node: {
                description: 'Cào video từ một kênh TikTok.',
                required_config: ['url_target', 'max_videos', 'extract_audio'],
              },
              ai_video_remaker_node: {
                description: 'Dùng AI để xào lại (remake) video nhằm chống bản quyền.',
                required_config: ['style', 'prompt_instructions', 'voice_dubbing'],
              },
              social_publisher_node: {
                description: 'Tự động đăng bài lên mạng xã hội (Facebook, TikTok).',
                required_config: ['platform', 'account_id', 'schedule_time'],
              },
              brandlabs_character_node: {
                description: 'Gắn tính cách KOL vào quy trình sinh nội dung.',
                required_config: ['character_id', 'tone_of_voice'],
              },
            },
          };
          break;

        // -- BrandLabs --
        case 'brandlabs_get_media_assets':
          result = await executeDynamicAPI(authHeader, 'marketing', 'GET', '/api/v1/media-assets');
          break;
        case 'brandlabs_create_brand_character':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/brand-characters',
            args,
          );
          break;
        case 'brandlabs_get_prompt_libraries':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/prompt-libraries',
          );
          break;

        // -- Chatbot --
        case 'chatbot_get_platforms':
          result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', '/api/v1/platforms');
          break;
        case 'chatbot_get_scenarios':
          result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', '/api/v1/scenarios');
          break;
        case 'chatbot_create_scenario':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'POST',
            '/api/v1/scenarios',
            args,
          );
          break;
        case 'chatbot_get_conversations':
          result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', '/api/v1/conversations');
          break;

        // -- Orchestration --
        case 'get_business_playbooks': {
          if (!prisma) {
            throw new Error('Prisma client not provided to fetch playbooks');
          }
          const playbooks = await prisma.aiBusinessPlaybooks.findMany({
            where: { is_active: true },
          });
          result = { playbooks };
          break;
        }

        default:
          throw new Error(`Tool not found: ${name}`);
      }

      return {
        content: [{ type: 'json', json: result }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: err.message || 'Unknown error' }],
        isError: true,
      };
    }
  }
}

export const mcpServer = new McpServer();
