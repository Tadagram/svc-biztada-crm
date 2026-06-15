import { executeDynamicAPI } from '../services/apiDispatcherClient';
import { McpToolCallRequest, McpToolCallResponse, getMcpToolsRegistry } from './registry';

export class McpServer {
  public async getTools(authHeader?: string) {
    return await getMcpToolsRegistry(authHeader);
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

      switch (name) {
        // -- Marketing --
        case 'marketing_create_account':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/accounts',
            args,
            businessId,
          );
          break;
        case 'marketing_get_workflows':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/workflows',
            undefined,
            businessId,
          );
          break;
        case 'marketing_create_workflow':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/workflows',
            args,
            businessId,
          );
          break;
        case 'marketing_run_workflow':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.workflow_id}/run-now`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_create_campaign':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/campaigns',
            args,
            businessId,
          );
          break;
        case 'marketing_configure_tiktok_harvest':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/harvest/tiktok',
            args,
            businessId,
          );
          break;
        case 'marketing_configure_fb_harvest':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/harvest/facebook',
            args,
            businessId,
          );
          break;
        case 'marketing_scan_leads':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/leads/scan',
            args,
            businessId,
          );
          break;
        case 'marketing_manage_fanpage':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/fanpage/status',
            args,
            businessId,
          );
          break;
        case 'marketing_create_funnel':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/funnels',
            args,
            businessId,
          );
          break;
        case 'marketing_get_accounts':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/my-accounts',
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_campaigns':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/campaigns',
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_seeding_contents':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/seeding-contents',
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_group_post_leads':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/group-post-leads',
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_engagement_post_leads':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/engagement-post-leads',
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_fanpages':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/fanpages',
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_schedules':
        case 'marketing_get_reports': {
          // 1. Get user's worker pool status
          const poolStatus = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/workers/pool-status',
            undefined,
            businessId,
          );

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
                undefined,
                businessId,
              );

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
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/media-assets',
            undefined,
            businessId,
          );
          break;
        case 'brandlabs_create_brand_character':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            '/api/v1/brand-characters',
            args,
            businessId,
          );
          break;
        case 'brandlabs_get_prompt_libraries':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            '/api/v1/prompt-libraries',
            undefined,
            businessId,
          );
          break;

        // -- Chatbot --
        case 'chatbot_get_platforms':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'GET',
            '/api/v1/platforms',
            undefined,
            businessId,
          );
          break;
        case 'chatbot_get_scenarios':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'GET',
            '/api/v1/scenarios',
            undefined,
            businessId,
          );
          break;
        case 'chatbot_create_scenario':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'POST',
            '/api/v1/scenarios',
            args,
            businessId,
          );
          break;
        case 'chatbot_get_conversations':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'GET',
            '/api/v1/conversations',
            undefined,
            businessId,
          );
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

        case 'marketing_post_accounts':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/accounts`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_accounts_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/accounts/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_accounts_worker_only':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/accounts`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_accounts_my_accounts':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/accounts/my-accounts`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_put_accounts_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/accounts/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_accounts_id_credentials':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/accounts/${args.id}/credentials`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_delete_accounts_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'DELETE',
            `/api/v1/accounts/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_put_accounts_id_cookies':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/accounts/${args.id}/cookies`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_accounts_available':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/accounts/available`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_post_accounts_id_release':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/accounts/${args.id}/release`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_accounts_id_increment':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/accounts/${args.id}/increment`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_patch_accounts_account_id_behavior_profile':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PATCH',
            `/api/v1/accounts/${args.account_id}/behavior-profile`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_ai_tools_worker_schedules':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/ai-tools/worker-schedules`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_ai_tools_worker_reports':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/ai-tools/worker-reports`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_dashboard':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/dashboard`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_put_accounts_id_demographics':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/accounts/${args.id}/demographics`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_put_accounts_id_personality':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/accounts/${args.id}/personality`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_put_accounts_id_interests':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/accounts/${args.id}/interests`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_accounts_id_generate_ai_profile':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/accounts/${args.id}/generate-ai-profile`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_accounts_id_demographics':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/accounts/${args.id}/demographics`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_post_accounts_generate_from_template':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/accounts/generate-from-template`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_funnels':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/funnels`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_funnels_id_link':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/funnels/${args.id}/link`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_funnels':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/funnels`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_delete_funnels_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'DELETE',
            `/api/v1/funnels/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_funnels_id_analytics':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/funnels/${args.id}/analytics`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_post_groups':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/groups`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_groups_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/groups/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_groups':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/groups`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_put_groups_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/groups/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_delete_groups_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'DELETE',
            `/api/v1/groups/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_post_groups_id_increment':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/groups/${args.id}/increment`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_groups_bulk':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/groups/bulk`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_posts':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/posts`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_posts_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/posts/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_posts':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/posts`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_put_posts_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/posts/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_delete_posts_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'DELETE',
            `/api/v1/posts/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_posts_random':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/posts/random`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_post_qa':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/qa`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_qa_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/qa/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_qa':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/qa`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_put_qa_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/qa/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_delete_qa_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'DELETE',
            `/api/v1/qa/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_qa_search':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/qa/search`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_reports_worker_url':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/reports/worker-url`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_schedules_worker_url':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/schedules/worker-url`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_schedules_workers':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/schedules/workers`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_tasks_weekly':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/tasks/weekly`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_tasks_statistics':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/tasks/statistics`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_get_my_workers':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/my-workers`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_post_workflows':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_get_workflows_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/workflows/${args.id}`,
            undefined,
            businessId,
          );
          break;
        //     case 'marketing_get_workflows':
        //       result = await executeDynamicAPI(authHeader, 'marketing', 'GET', `/api/v1/workflows`, undefined, businessId);
        //       break;
        case 'marketing_get_workflows_worker_worker_uuid':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'GET',
            `/api/v1/workflows/worker/${args.worker_uuid}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_put_workflows_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'PUT',
            `/api/v1/workflows/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_delete_workflows_id':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'DELETE',
            `/api/v1/workflows/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'marketing_post_workflows_id_duplicate':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.id}/duplicate`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_workflows_id_activate':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.id}/activate`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_workflows_id_deactivate':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.id}/deactivate`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_workflows_id_execute':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.id}/execute`,
            args.body,
            businessId,
          );
          break;
        case 'marketing_post_workflows_id_run_now':
          result = await executeDynamicAPI(
            authHeader,
            'marketing',
            'POST',
            `/api/v1/workflows/${args.id}/run-now`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_get_browser_accounts':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'GET',
            `/api/v1/browser-accounts`,
            undefined,
            businessId,
          );
          break;
        case 'chatbot_post_browser_accounts':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'POST',
            `/api/v1/browser-accounts`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_get_browser_accounts_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'GET',
            `/api/v1/browser-accounts/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'chatbot_put_browser_accounts_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'PUT',
            `/api/v1/browser-accounts/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_delete_browser_accounts_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'DELETE',
            `/api/v1/browser-accounts/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'chatbot_get_my_chatbots':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'GET',
            `/api/v1/my-chatbots`,
            undefined,
            businessId,
          );
          break;
        //     case 'chatbot_get_platforms':
        //       result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', `/api/v1/platforms`, undefined, businessId);
        //       break;
        case 'chatbot_post_platforms':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'POST',
            `/api/v1/platforms`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_get_platforms_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'GET',
            `/api/v1/platforms/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'chatbot_put_platforms_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'PUT',
            `/api/v1/platforms/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_post_worker_allocate':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'POST',
            `/api/v1/worker/allocate`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_delete_platforms_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'DELETE',
            `/api/v1/platforms/${args.id}`,
            undefined,
            businessId,
          );
          break;
        //     case 'chatbot_get_scenarios':
        //       result = await executeDynamicAPI(authHeader, 'chatbot', 'GET', `/api/v1/scenarios`, undefined, businessId);
        //       break;
        case 'chatbot_post_scenarios':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'POST',
            `/api/v1/scenarios`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_put_scenarios_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'PUT',
            `/api/v1/scenarios/${args.id}`,
            args.body,
            businessId,
          );
          break;
        case 'chatbot_delete_scenarios_id':
          result = await executeDynamicAPI(
            authHeader,
            'chatbot',
            'DELETE',
            `/api/v1/scenarios/${args.id}`,
            undefined,
            businessId,
          );
          break;

        case 'crm_post__':
          result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/`, args.body, businessId);
          break;
        case 'crm_get__':
          result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
          break;
        case 'crm_delete__agencyWorkerId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/${args.agencyWorkerId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_patch__agencyWorkerId_reactivate':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PATCH',
            `/${args.agencyWorkerId}/reactivate`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__agencyWorkerId_assign_user':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/${args.agencyWorkerId}/assign-user`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__agencyWorkerId_release':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/${args.agencyWorkerId}/release`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__chat':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/chat`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__history':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/history`,
            undefined,
            businessId,
          );
          break;
        case 'crm_delete__history':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/history`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__revenue':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/revenue`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__state':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/state`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__listings':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/listings`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__listings_purchase':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/listings/purchase`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__withdrawals':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/withdrawals`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__trades_release':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/trades/release`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__trades_dispute':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/trades/dispute`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__listings_approve':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/listings/approve`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__trades_dispute_resolve':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/trades/dispute/resolve`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__withdrawals_approve':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/withdrawals/approve`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__listings':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/listings`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__trades':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/trades`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__withdrawals':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/withdrawals`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__tools':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/tools`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__tools_call':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/tools/call`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__stream':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/stream`,
            undefined,
            businessId,
          );
          break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        case 'crm_get__unread_count':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/unread-count`,
            undefined,
            businessId,
          );
          break;
        case 'crm_patch__read_all':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PATCH',
            `/read-all`,
            args.body,
            businessId,
          );
          break;
        case 'crm_patch__notificationId_read':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PATCH',
            `/${args.notificationId}/read`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_post__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/`, args.body, businessId);
        //       break;
        //     case 'crm_post__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/`, args.body, businessId);
        //       break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        case 'crm_put__permissionId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PUT',
            `/${args.permissionId}`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__permissionId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/${args.permissionId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__check':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/check`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__check_all':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/check-all`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__check_any':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/check-any`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__me':
          result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/me`, undefined, businessId);
          break;
        case 'crm_get__user_userId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/user/${args.userId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__user_userId_override':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/user/${args.userId}/override`,
            args.body,
            businessId,
          );
          break;
        case 'crm_patch__user_userId_overrides':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PATCH',
            `/user/${args.userId}/overrides`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__user_userId_override':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/user/${args.userId}/override`,
            undefined,
            businessId,
          );
          break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        case 'crm_post__transfer':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/transfer`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__id':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/${args.id}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__settings':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/settings`,
            undefined,
            businessId,
          );
          break;
        case 'crm_put__settings':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PUT',
            `/settings`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__eligible_users':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/eligible-users`,
            undefined,
            businessId,
          );
          break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        //     case 'crm_post__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/`, args.body, businessId);
        //       break;
        case 'crm_get__promotionId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/${args.promotionId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_put__promotionId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PUT',
            `/${args.promotionId}`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__promotionId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/${args.promotionId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__promotionId_execute':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/${args.promotionId}/execute`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        case 'crm_post__purchase':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/purchase`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_post__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/`, args.body, businessId);
        //       break;
        case 'crm_patch__servicePackageId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PATCH',
            `/${args.servicePackageId}`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__servicePackageId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/${args.servicePackageId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__purchases':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/purchases`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__license_keys':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/license-keys`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__license_keys_keyId_renew':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/license-keys/${args.keyId}/renew`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__license_keys_system':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/license-keys/system`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__license_keys_system_keyId_renew':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/license-keys/system/${args.keyId}/renew`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__license_keys_system_keyId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/license-keys/system/${args.keyId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__qr_code':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/qr-code`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__qr_code':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/qr-code`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__guest':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/guest`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__guest':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/guest`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__ai':
          result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/ai`, args.body, businessId);
          break;
        case 'crm_get__strategic_direction':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/strategic-direction`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__strategic_direction':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/strategic-direction`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__market_profile':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/market-profile`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__market_profile':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/market-profile`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__action_plan':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/action-plan`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__action_plan':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/action-plan`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__features':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/features`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__features':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/features`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__matrix':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/matrix`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__matrix':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/matrix`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__factory':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/factory`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__factory':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/factory`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__seeding':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/seeding`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__seeding':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/seeding`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__content_engine':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/content-engine`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__content_engine':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/content-engine`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__social_amplification':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/social-amplification`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__social_amplification':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/social-amplification`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__conversion_gateway':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/conversion-gateway`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__conversion_gateway':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/conversion-gateway`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__pipeline_engine':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/pipeline-engine`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__pipeline_engine':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/pipeline-engine`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__loyalty_loop':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/loyalty-loop`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__loyalty_loop':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/loyalty-loop`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__content_network':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/content-network`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__content_network':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/content-network`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__feedback':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/feedback`,
            args.body,
            businessId,
          );
          break;
        case 'crm_get__session_history':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/session-history`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__claim_guest':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/claim-guest`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_get__stream':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/stream`, undefined, businessId);
        //       break;
        case 'crm_post__submit':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/submit`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_get__me':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/me`, undefined, businessId);
        //       break;
        case 'crm_get__credits_balance':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/credits/balance`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__credits_ledger':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/credits/ledger`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__credits_deduct':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/credits/deduct`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__credits_internal_deduct':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/credits/internal/deduct`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__credits_internal_refund':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/credits/internal/refund`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        case 'crm_get__topupId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/${args.topupId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__topupId_approve':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/${args.topupId}/approve`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__topupId_reject':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/${args.topupId}/reject`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        case 'crm_get__by_worker':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/by-worker`,
            undefined,
            businessId,
          );
          break;
        //     case 'crm_post__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/`, args.body, businessId);
        //       break;
        //     case 'crm_get__me':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/me`, undefined, businessId);
        //       break;
        case 'crm_put__me':
          result = await executeDynamicAPI(authHeader, 'crm', 'PUT', `/me`, args.body, businessId);
          break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        case 'crm_get__stats':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/stats`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__customer_stats':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/customer-stats`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__userId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/${args.userId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_patch__userId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PATCH',
            `/${args.userId}`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__userId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/${args.userId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__userId_summary':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/${args.userId}/summary`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__userId_insight':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/${args.userId}/insight`,
            undefined,
            businessId,
          );
          break;
        case 'crm_post__verify':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/verify`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__refresh':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/refresh`,
            args.body,
            businessId,
          );
          break;
        case 'crm_post__admin_telegram_login':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'POST',
            `/admin-telegram-login`,
            args.body,
            businessId,
          );
          break;
        //     case 'crm_post__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'POST', `/`, args.body, businessId);
        //       break;
        //     case 'crm_get__':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/`, undefined, businessId);
        //       break;
        //     case 'crm_get__stats':
        //       result = await executeDynamicAPI(authHeader, 'crm', 'GET', `/stats`, undefined, businessId);
        //       break;
        case 'crm_get__active':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/active`,
            undefined,
            businessId,
          );
          break;
        case 'crm_get__workerId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'GET',
            `/${args.workerId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_put__workerId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PUT',
            `/${args.workerId}`,
            args.body,
            businessId,
          );
          break;
        case 'crm_delete__workerId':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'DELETE',
            `/${args.workerId}`,
            undefined,
            businessId,
          );
          break;
        case 'crm_patch__workerId_reactivate':
          result = await executeDynamicAPI(
            authHeader,
            'crm',
            'PATCH',
            `/${args.workerId}/reactivate`,
            args.body,
            businessId,
          );
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
