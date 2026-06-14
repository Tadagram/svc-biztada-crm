import { executeDynamicAPI } from '../services/apiDispatcherClient';
import { McpToolCallRequest, McpToolCallResponse, getMcpToolsRegistry } from './registry';

export class McpServer {
  public async getTools(authHeader?: string) {
    return await getMcpToolsRegistry(authHeader);
  }

  public async callTool(
    authHeader: string,
    request: McpToolCallRequest,
    prisma?: any, businessId?: string,
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
           businessId);
          break;
        case 'marketing_get_workflows':
          result = await executeDynamicAPI(authHeader, 'marketing', 'GET', '/api/v1/workflows', undefined, businessId);
          break;
        case 'marketing_create_workflow':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/workflows',
            args,
           businessId);
          break;
        case 'marketing_run_workflow':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.workflow_id}/run-now`,
           undefined, businessId);
          break;
        case 'marketing_create_campaign':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/campaigns',
            args,
           businessId);
          break;
        case 'marketing_configure_tiktok_harvest':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/harvest/tiktok',
            args,
           businessId);
          break;
        case 'marketing_configure_fb_harvest':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/harvest/facebook',
            args,
           businessId);
          break;
        case 'marketing_scan_leads':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/leads/scan',
            args,
           businessId);
          break;
        case 'marketing_manage_fanpage':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/fanpage/status',
            args,
           businessId);
          break;
        case 'marketing_create_funnel':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/funnels',
            args,
           businessId);
          break;
        case 'marketing_get_schedules':
        case 'marketing_get_reports': {
          // 1. Get user's worker pool status
          const poolStatus = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/workers/pool-status',
           undefined, businessId);

          if (
            !poolStatus ||
            !poolStatus.data ||
            !poolStatus.data.my_workers ||
            poolStatus.data.my_workers.length === 0
          ) {
            result = { message: 'Không tìm thấy worker nào đang hoạt động cho tài khoản này.' };
            break;
          }

          const activeWorkers = poolStatus.data.my_workers.filter(
            (w: any) => w.status === 'online' || w.status === 'idle' || w.status === 'busy',
          );

          if (activeWorkers.length === 0) {
            result = { message: 'Các worker của bạn hiện đang offline.' };
            break;
          }

          const combinedResults: any = { workers_data: [] };
          const isSchedule = name === 'marketing_get_schedules';
          const endpointPath = isSchedule
            ? '/api/v1/schedules/worker-url'
            : '/api/v1/reports/worker-url';

          for (const w of activeWorkers) {
            try {
              // 2. Get tunnel URL and JWT token for each worker
              const workerAccess = await executeDynamicAPI(
                authHeader,
                'marketing',
                'GET',
                `${endpointPath}?worker_uuid=${w.uuid}`,
               undefined, businessId);

              if (workerAccess && workerAccess.success && workerAccess.jwt_token) {
                // 3. Call the tunnel directly
                const tunnelUrl = isSchedule
                  ? workerAccess.endpoints.master_calendar
                  : workerAccess.endpoints.reports_list || workerAccess.endpoints.list_reports;

                // reports endpoint keys varies depending on backend code ("reports_list" or "list_reports")
                const finalUrl =
                  tunnelUrl ||
                  workerAccess.worker.url + (isSchedule ? '/schedules/master' : '/reports/list');

                const response = await fetch(finalUrl, {
                  headers: {
                    Authorization: `Bearer ${workerAccess.jwt_token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (response.ok) {
                  const data = await response.json();
                  combinedResults.workers_data.push({
                    worker_uuid: w.uuid,
                    worker_name: w.name,
                    data: data,
                  });
                } else {
                  combinedResults.workers_data.push({
                    worker_uuid: w.uuid,
                    worker_name: w.name,
                    error: `Worker returned status ${response.status}`,
                  });
                }
              }
            } catch (err: any) {
              combinedResults.workers_data.push({
                worker_uuid: w.uuid,
                worker_name: w.name,
                error: `Failed to connect: ${err.message}`,
              });
            }
          }
          result = combinedResults;
          break;
        }

        // -- BrandLabs --
        case 'brandlabs_get_media_assets':
          result = await executeDynamicAPI(authHeader, 'marketing', 'GET', '/api/v1/media-assets', undefined, businessId);
          break;
        case 'brandlabs_create_brand_character':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/brand-characters',
            args,
           businessId);
          break;
        case 'brandlabs_get_prompt_libraries':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/prompt-libraries',
           undefined, businessId);
          break;

        // -- Chatbot --
        case 'chatbot_get_platforms':
          result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', '/api/v1/platforms', undefined, businessId);
          break;
        case 'chatbot_get_scenarios':
          result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', '/api/v1/scenarios', undefined, businessId);
          break;
        case 'chatbot_create_scenario':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'POST',
            '/api/v1/scenarios',
            args,
           businessId);
          break;
        case 'chatbot_get_conversations':
          result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', '/api/v1/conversations', undefined, businessId);
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
