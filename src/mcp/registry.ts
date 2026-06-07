export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
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

export const MCP_TOOLS_REGISTRY: McpToolSchema[] = [
  // ── Marketing Tools ──
  {
    name: 'marketing_create_account',
    description: 'Tạo tài khoản mạng xã hội mới (Facebook, TikTok...) trong hệ thống marketing.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Nền tảng (vd: facebook, tiktok)' },
        account_name: { type: 'string', description: 'Tên tài khoản' },
        credentials: { type: 'object', description: 'Thông tin xác thực' },
        status: { type: 'string', description: 'Trạng thái ban đầu' },
      },
      required: ['platform', 'account_name'],
    },
  },
  {
    name: 'marketing_get_workflows',
    description: 'Lấy toàn bộ các luồng công việc (workflows) marketing.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'marketing_create_workflow',
    description:
      'Tạo mới Workflow marketing. CÁC NODES HỖ TRỢ HIỆN TẠI: tiktok_scraper_node (cào dữ liệu), ai_video_remaker_node (xào lại video), social_publisher_node (đăng bài tự động), brandlabs_character_node (gắn tính cách KOL). Dùng các node này để xây dựng kịch bản tự động.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        nodes: { type: 'array' },
        edges: { type: 'array' },
      },
      required: ['name'],
    },
  },
  {
    name: 'marketing_run_workflow',
    description: 'Kích hoạt ép chạy ngay lập tức Workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'ID của workflow cần chạy' },
      },
      required: ['workflow_id'],
    },
  },

  // ── BrandLabs Tools ──
  {
    name: 'brandlabs_get_media_assets',
    description: 'Xem toàn bộ tài sản truyền thông, hình ảnh, video trong kho BrandLabs.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'brandlabs_create_brand_character',
    description: 'Tạo hồ sơ tính cách thương hiệu cho AI.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        tone: { type: 'string' },
        instructions: { type: 'string' },
      },
      required: ['name', 'tone'],
    },
  },
  {
    name: 'brandlabs_get_prompt_libraries',
    description: 'Lấy các mẫu Prompt AI có sẵn trong BrandLabs.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ── Chatbot Tools ──
  {
    name: 'chatbot_get_platforms',
    description: 'Lấy danh sách các trang/kênh Chatbot đang quản lý (Fanpage, Zalo...).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'chatbot_get_scenarios',
    description: 'Lấy danh sách kịch bản trả lời tự động.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'chatbot_create_scenario',
    description: 'Tạo kịch bản chatbot mới.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        triggers: { type: 'array' },
        steps: { type: 'array' },
        is_active: { type: 'boolean' },
      },
      required: ['name'],
    },
  },
  {
    name: 'chatbot_get_conversations',
    description: 'Xem danh sách tin nhắn khách hàng đổ về Chatbot.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ── Orchestration Tools ──
  {
    name: 'get_business_playbooks',
    description:
      'Lấy danh sách các Cẩm nang Giải pháp (Business Playbooks) để biết cách phối hợp nhiều Tools thành một luồng công việc (Pipeline) hoàn chỉnh.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export function getMcpToolsRegistry(): McpToolSchema[] {
  return MCP_TOOLS_REGISTRY;
}
