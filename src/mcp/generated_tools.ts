

export const generatedTools = [
  {
    name: 'marketing_post_accounts',
    description: 'Call POST /api/v1/accounts on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_get_accounts_id',
    description: 'Call GET /api/v1/accounts/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_accounts',
    description: 'Call GET /api/v1/accounts on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_accounts_my_accounts',
    description: 'Call GET /api/v1/accounts/my-accounts on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_put_accounts_id',
    description: 'Call PUT /api/v1/accounts/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_get_accounts_id_credentials',
    description: 'Call GET /api/v1/accounts/{id}/credentials on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_delete_accounts_id',
    description: 'Call DELETE /api/v1/accounts/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_put_accounts_id_cookies',
    description: 'Call PUT /api/v1/accounts/{id}/cookies on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_get_accounts_available',
    description: 'Call GET /api/v1/accounts/available on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_post_accounts_id_release',
    description: 'Call POST /api/v1/accounts/{id}/release on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_post_accounts_id_increment',
    description: 'Call POST /api/v1/accounts/{id}/increment on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_patch_accounts_account_id_behavior_profile',
    description: 'Call PATCH /api/v1/accounts/{account_id}/behavior-profile on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"account_id": {"type": "string", "description": "Path variable: account_id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["account_id", "body"]},
  },
  {
    name: 'marketing_post_ai_tools_worker_schedules',
    description: 'Call POST /api/v1/ai-tools/worker-schedules on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_post_ai_tools_worker_reports',
    description: 'Call POST /api/v1/ai-tools/worker-reports on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_get_dashboard',
    description: 'Call GET /api/v1/dashboard on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_put_accounts_id_demographics',
    description: 'Call PUT /api/v1/accounts/{id}/demographics on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_put_accounts_id_personality',
    description: 'Call PUT /api/v1/accounts/{id}/personality on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_put_accounts_id_interests',
    description: 'Call PUT /api/v1/accounts/{id}/interests on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_post_accounts_id_generate_ai_profile',
    description: 'Call POST /api/v1/accounts/{id}/generate-ai-profile on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_get_accounts_id_demographics',
    description: 'Call GET /api/v1/accounts/{id}/demographics on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_post_accounts_generate_from_template',
    description: 'Call POST /api/v1/accounts/generate-from-template on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_post_funnels',
    description: 'Call POST /api/v1/funnels on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_get_funnels_id_link',
    description: 'Call GET /api/v1/funnels/{id}/link on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_funnels',
    description: 'Call GET /api/v1/funnels on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_delete_funnels_id',
    description: 'Call DELETE /api/v1/funnels/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_funnels_id_analytics',
    description: 'Call GET /api/v1/funnels/{id}/analytics on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_post_groups',
    description: 'Call POST /api/v1/groups on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_get_groups_id',
    description: 'Call GET /api/v1/groups/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_groups',
    description: 'Call GET /api/v1/groups on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_put_groups_id',
    description: 'Call PUT /api/v1/groups/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_delete_groups_id',
    description: 'Call DELETE /api/v1/groups/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_post_groups_id_increment',
    description: 'Call POST /api/v1/groups/{id}/increment on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_post_groups_bulk',
    description: 'Call POST /api/v1/groups/bulk on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_post_posts',
    description: 'Call POST /api/v1/posts on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_get_posts_id',
    description: 'Call GET /api/v1/posts/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_posts',
    description: 'Call GET /api/v1/posts on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_put_posts_id',
    description: 'Call PUT /api/v1/posts/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_delete_posts_id',
    description: 'Call DELETE /api/v1/posts/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_posts_random',
    description: 'Call GET /api/v1/posts/random on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_post_qa',
    description: 'Call POST /api/v1/qa on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_get_qa_id',
    description: 'Call GET /api/v1/qa/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_qa',
    description: 'Call GET /api/v1/qa on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_put_qa_id',
    description: 'Call PUT /api/v1/qa/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_delete_qa_id',
    description: 'Call DELETE /api/v1/qa/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_qa_search',
    description: 'Call GET /api/v1/qa/search on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_reports_worker_url',
    description: 'Call GET /api/v1/reports/worker-url on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_schedules_worker_url',
    description: 'Call GET /api/v1/schedules/worker-url on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_schedules_workers',
    description: 'Call GET /api/v1/schedules/workers on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_tasks_weekly',
    description: 'Call GET /api/v1/tasks/weekly on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_tasks_statistics',
    description: 'Call GET /api/v1/tasks/statistics on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_my_workers',
    description: 'Call GET /api/v1/my-workers on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_post_workflows',
    description: 'Call POST /api/v1/workflows on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'marketing_get_workflows_id',
    description: 'Call GET /api/v1/workflows/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_get_workflows',
    description: 'Call GET /api/v1/workflows on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'marketing_get_workflows_worker_worker_uuid',
    description: 'Call GET /api/v1/workflows/worker/{worker_uuid} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"worker_uuid": {"type": "string", "description": "Path variable: worker_uuid"}}, "required": ["worker_uuid"]},
  },
  {
    name: 'marketing_put_workflows_id',
    description: 'Call PUT /api/v1/workflows/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_delete_workflows_id',
    description: 'Call DELETE /api/v1/workflows/{id} on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'marketing_post_workflows_id_duplicate',
    description: 'Call POST /api/v1/workflows/{id}/duplicate on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_post_workflows_id_activate',
    description: 'Call POST /api/v1/workflows/{id}/activate on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_post_workflows_id_deactivate',
    description: 'Call POST /api/v1/workflows/{id}/deactivate on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_post_workflows_id_execute',
    description: 'Call POST /api/v1/workflows/{id}/execute on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'marketing_post_workflows_id_run_now',
    description: 'Call POST /api/v1/workflows/{id}/run-now on svc-business-marketing',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'chatbot_get_browser_accounts',
    description: 'Call GET /api/v1/browser-accounts on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'chatbot_post_browser_accounts',
    description: 'Call POST /api/v1/browser-accounts on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'chatbot_get_browser_accounts_id',
    description: 'Call GET /api/v1/browser-accounts/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'chatbot_put_browser_accounts_id',
    description: 'Call PUT /api/v1/browser-accounts/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'chatbot_delete_browser_accounts_id',
    description: 'Call DELETE /api/v1/browser-accounts/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'chatbot_get_my_chatbots',
    description: 'Call GET /api/v1/my-chatbots on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'chatbot_get_platforms',
    description: 'Call GET /api/v1/platforms on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'chatbot_post_platforms',
    description: 'Call POST /api/v1/platforms on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'chatbot_get_platforms_id',
    description: 'Call GET /api/v1/platforms/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'chatbot_put_platforms_id',
    description: 'Call PUT /api/v1/platforms/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'chatbot_post_worker_allocate',
    description: 'Call POST /api/v1/worker/allocate on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'chatbot_delete_platforms_id',
    description: 'Call DELETE /api/v1/platforms/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
  {
    name: 'chatbot_get_scenarios',
    description: 'Call GET /api/v1/scenarios on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {}, "required": []},
  },
  {
    name: 'chatbot_post_scenarios',
    description: 'Call POST /api/v1/scenarios on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["body"]},
  },
  {
    name: 'chatbot_put_scenarios_id',
    description: 'Call PUT /api/v1/scenarios/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}, "body": {"type": "object", "description": "Request body JSON payload"}}, "required": ["id", "body"]},
  },
  {
    name: 'chatbot_delete_scenarios_id',
    description: 'Call DELETE /api/v1/scenarios/{id} on svc-business-chatbot',
    inputSchema: {"type": "object", "properties": {"id": {"type": "string", "description": "Path variable: id"}}, "required": ["id"]},
  },
];
