import { executeDynamicAPI } from '../services/apiDispatcherClient';
import { McpToolCallRequest, McpToolCallResponse, getMcpToolsRegistry } from './registry';

export class McpServer {
  public getTools() {
    return getMcpToolsRegistry();
  }

  public async callTool(
    authHeader: string,
    request: McpToolCallRequest,
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
        case 'get_business_playbooks':
          result = {
            playbooks: [
              {
                id: 'pb_fashion_auto',
                name: 'Tự động hóa kênh Thời trang / Bán lẻ',
                description: 'Xây dựng kênh truyền thông tự động cho mảng thời trang.',
                steps: [
                  {
                    step: 1,
                    tool: 'brandlabs_create_brand_character',
                    action: 'Tạo KOL thời trang mang phong cách năng động.',
                  },
                  {
                    step: 2,
                    tool: 'marketing_create_workflow',
                    action:
                      'Tạo workflow dùng tiktok_scraper_node để lấy video hot, sau đó dùng ai_video_remaker_node xào lại, và social_publisher_node để đăng lên FB.',
                  },
                ],
              },
              {
                id: 'pb_customer_support',
                name: 'Tự động hóa CSKH Đa kênh',
                description: 'Setup hệ thống trả lời tự động và phân luồng hội thoại.',
                steps: [
                  {
                    step: 1,
                    tool: 'brandlabs_create_brand_character',
                    action: 'Tạo Bot mang tính cách thân thiện, chuyên nghiệp.',
                  },
                  {
                    step: 2,
                    tool: 'chatbot_create_scenario',
                    action: 'Tạo kịch bản (Scenario) chào mừng và xin số điện thoại.',
                  },
                ],
              },
            ],
          };
          break;

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
