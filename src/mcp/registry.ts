import { executeDynamicAPI } from '../services/apiDispatcherClient';

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

const MCP_TOOLS_REGISTRY_BASE: McpToolSchema[] = [
  // ── Marketing Tools ──
  {
    name: 'marketing_create_account',
    description: 'Tạo tài khoản mạng xã hội mới (Facebook, TikTok...) trong hệ thống marketing.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Nền tảng (vd: facebook, tiktok)' },
        username: { type: 'string', description: 'Tên tài khoản (username, email, or numeric ID)' },
        email: { type: 'string', description: 'Email của tài khoản (tuỳ chọn)' },
        password: {
          type: 'string',
          description: 'Mật khẩu (bắt buộc cho facebook/instagram, bỏ trống nếu tiktok)',
        },
        two_fa_secret: { type: 'string', description: 'Mã bảo mật 2FA (nếu có)' },
        status: { type: 'string', description: 'Trạng thái ban đầu' },
      },
      required: ['platform', 'username'],
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
      'Tạo mới Workflow marketing. Định nghĩa các node chính xác theo chuẩn kỹ thuật (không được tự bịa node).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên Workflow' },
        description: { type: 'string', description: 'Mô tả về mục đích Workflow' },
        campaign_id: {
          type: 'string',
          description: 'ID chiến dịch nếu thuộc một chiến dịch cụ thể',
        },
        category: { type: 'string', description: 'Phân loại workflow (general, lead_scan)' },
        config: {
          type: 'object',
          description: 'Cấu hình chung (run_type, global_delay, execution_mode...)',
        },
        nodes: {
          type: 'array',
          items: {
            oneOf: [],
          },
          description: 'Danh sách các Nodes',
        },
        edges: {
          type: 'array',
          items: {
            properties: { source: { type: 'string' }, target: { type: 'string' } },
            required: ['source', 'target'],
          },
          description: 'Danh sách các Edges liên kết',
        },
      },
      required: ['name', 'nodes', 'edges'],
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
  {
    name: 'marketing_create_campaign',
    description:
      'Tạo một chiến dịch marketing tự động mới (lên lịch nội dung, chỉ định seeding accounts).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên chiến dịch' },
        start_date: {
          type: 'string',
          description: 'Ngày bắt đầu theo chuẩn ISO 8601 (VD: 2026-06-15T00:00:00Z)',
        },
        description: { type: 'string', description: 'Mô tả chiến dịch' },
      },
      required: ['name', 'start_date'],
    },
  },
  {
    name: 'marketing_configure_tiktok_harvest',
    description: 'Cấu hình quét và tự động tải video từ kênh TikTok vào BrandLabs Vault.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID của tài khoản TikTok sẽ thực thi' },
        channel_url: { type: 'string', description: 'URL kênh TikTok cần quét' },
        schedule_type: {
          type: 'string',
          description: 'Loại lịch chạy: manual, daily, hoặc weekly',
        },
        schedule_hour: { type: 'integer', description: 'Giờ chạy trong ngày (0-23)' },
        schedule_weekday: { type: 'integer', description: 'Ngày trong tuần (0-6) nếu chạy weekly' },
        max_videos: { type: 'integer', description: 'Số video tối đa mỗi lần tải' },
      },
      required: ['account_id', 'channel_url', 'schedule_type'],
    },
  },
  {
    name: 'marketing_configure_fb_harvest',
    description: 'Cấu hình quét tự động bài viết, hình ảnh, reels từ trang/Profile Facebook.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID của tài khoản Facebook sẽ thực thi' },
        target_url: { type: 'string', description: 'URL trang Facebook/Profile cần quét' },
        media_type: { type: 'string', description: 'Loại nội dung: photo hoặc reel' },
        schedule_type: {
          type: 'string',
          description: 'Loại lịch chạy: manual, daily, hoặc weekly',
        },
        schedule_hour: { type: 'integer', description: 'Giờ chạy trong ngày (0-23)' },
        schedule_weekday: { type: 'integer', description: 'Ngày trong tuần (0-6) nếu chạy weekly' },
      },
      required: ['account_id', 'target_url', 'schedule_type'],
    },
  },
  {
    name: 'marketing_scan_leads',
    description:
      'Kích hoạt luồng quét khách hàng (Lead Scan) từ các bài đăng Facebook để đưa về CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        post_url: { type: 'string', description: 'Link bài đăng Facebook cần quét bình luận' },
      },
      required: ['post_url'],
    },
  },
  {
    name: 'marketing_manage_fanpage',
    description:
      'Danh sách chức năng tương tác Fanpage (đồng bộ bài đăng, trả lời bình luận, tin nhắn).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'marketing_create_funnel',
    description: 'Tạo một phễu bán hàng (landing page) mới để thu thập thông tin khách hàng.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên phễu' },
        description: { type: 'string', description: 'Mô tả mục đích phễu' },
        url: { type: 'string', description: 'Đường dẫn URL của landing page gốc' },
      },
      required: ['name', 'url'],
    },
  },
  {
    name: 'marketing_get_schedules',
    description:
      'Lấy lịch trình (schedules) tổng quát (master calendar) từ tất cả các worker tự động đang hoạt động của user.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'marketing_get_reports',
    description:
      'Lấy danh sách các báo cáo thực thi (reports) gần đây từ tất cả các worker tự động đang hoạt động của user.',
    inputSchema: {
      type: 'object',
      properties: {},
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
    description: 'Tạo một Brand Character/Persona mới cho doanh nghiệp.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên nhân vật/Persona' },
        description: { type: 'string', description: 'Mô tả chi tiết' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Danh sách nhãn/tags' },
        folder_id: { type: 'string', description: 'ID thư mục chứa tài nguyên' },
        folder_name: { type: 'string', description: 'Tên thư mục' },
      },
      required: ['name'],
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
    description: 'Tạo kịch bản chatbot mới với các bước xử lý chính xác theo chuẩn kỹ thuật.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên kịch bản' },
        description: { type: 'string', description: 'Mô tả kịch bản' },
        trigger_type: {
          type: 'string',
          description: 'Loại trigger (keyword, greeting, menu, webhook, schedule)',
        },
        trigger_config: { type: 'object', description: 'Cấu hình chi tiết cho trigger' },
        flow_definition: { type: 'object', description: 'Định nghĩa luồng kịch bản (Flow)' },
        priority: { type: 'integer', description: 'Độ ưu tiên' },
        is_active: { type: 'boolean', description: 'Kích hoạt ngay' },
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Danh sách nền tảng áp dụng',
        },
      },
      required: ['name', 'trigger_type', 'trigger_config', 'flow_definition'],
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

export async function getMcpToolsRegistry(authHeader?: string): Promise<McpToolSchema[]> {
  const registry = JSON.parse(JSON.stringify(MCP_TOOLS_REGISTRY_BASE)) as McpToolSchema[];

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
