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
        credentials: { type: 'object', description: 'Thông tin xác thực' },
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
        name: { type: 'string' },
        description: { type: 'string' },
        nodes: {
          type: 'array',
          items: {
            oneOf: [],
          },
        },
        edges: {
          type: 'array',
          items: {
            properties: { source_node_id: { type: 'string' }, target_node_id: { type: 'string' } },
            required: ['source_node_id', 'target_node_id'],
          },
        },
      },
      required: ['name', 'nodes'],
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
      },
      required: ['name'],
    },
  },
  {
    name: 'marketing_configure_tiktok_harvest',
    description: 'Cấu hình quét và tự động tải video từ kênh TikTok vào BrandLabs Vault.',
    inputSchema: {
      type: 'object',
      properties: {
        channel_url: { type: 'string', description: 'URL kênh TikTok cần quét' },
        schedule: { type: 'string', description: 'Lịch chạy cron (VD: 0 0 * * *)' },
      },
      required: ['channel_url', 'schedule'],
    },
  },
  {
    name: 'marketing_configure_fb_harvest',
    description: 'Cấu hình quét tự động bài viết, hình ảnh, reels từ trang/Profile Facebook.',
    inputSchema: {
      type: 'object',
      properties: {
        target_url: { type: 'string', description: 'URL trang Facebook/Profile cần quét' },
        schedule: { type: 'string', description: 'Lịch chạy cron (VD: 0 0 * * *)' },
      },
      required: ['target_url', 'schedule'],
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
      },
      required: ['name'],
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
    description: 'Tạo kịch bản chatbot mới với các bước xử lý chính xác theo chuẩn kỹ thuật.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        triggers: {
          type: 'array',
          items: {
            properties: {
              type: { const: 'keyword_match' },
              keywords: { type: 'array', items: { type: 'string' } },
            },
            required: ['type', 'keywords'],
          },
        },
        steps: {
          type: 'array',
          items: {
            oneOf: [
              {
                properties: { type: { const: 'send_text' }, text: { type: 'string' } },
                required: ['type', 'text'],
              },
              {
                properties: {
                  type: { const: 'ask_phone' },
                  validation_message: { type: 'string' },
                },
                required: ['type'],
              },
              {
                properties: {
                  type: { const: 'call_api' },
                  endpoint: { type: 'string' },
                  method: { type: 'string' },
                },
                required: ['type', 'endpoint'],
              },
            ],
          },
        },
        is_active: { type: 'boolean' },
      },
      required: ['name', 'steps'],
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
