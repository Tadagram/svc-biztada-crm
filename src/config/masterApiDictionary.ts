export const MASTER_API_DICTIONARY = {
  marketing: [
    {
      name: 'Tạo tài khoản Marketing',
      endpoint: '/api/v1/accounts',
      method: 'POST',
      description: 'Tạo tài khoản mạng xã hội mới (Facebook, TikTok...).',
      payload_schema: {
        platform: 'string',
        account_name: 'string',
        credentials: 'object',
        status: 'string',
      },
    },
    {
      name: 'Danh sách Workflow',
      endpoint: '/api/v1/workflows',
      method: 'GET',
      description: 'Lấy toàn bộ các luồng công việc (workflows).',
    },
    {
      name: 'Tạo mới Workflow',
      endpoint: '/api/v1/workflows',
      method: 'POST',
      description: 'Tạo mới Workflow.',
      payload_schema: { name: 'string', description: 'string', nodes: 'array', edges: 'array' },
    },
    {
      name: 'Cập nhật Workflow',
      endpoint: '/api/v1/workflows/:id',
      method: 'PUT',
      description: "Chỉnh sửa nội dung Workflow. Yêu cầu thay ':id'.",
    },
    {
      name: 'Chạy ngay Workflow',
      endpoint: '/api/v1/workflows/:id/run-now',
      method: 'POST',
      description: 'Kích hoạt ép chạy ngay lập tức Workflow.',
    },
  ],
  brandlabs: [
    {
      name: 'Danh sách Media Assets',
      endpoint: '/api/v1/media-assets',
      method: 'GET',
      description: 'Xem toàn bộ tài sản truyền thông, hình ảnh, video trong kho BrandLabs.',
    },
    {
      name: 'Lấy trạng thái Vault',
      endpoint: '/api/v1/vault/status',
      method: 'GET',
      description: 'Kiểm tra trạng thái Telegram Vault lưu trữ tài sản BrandLabs.',
    },
    {
      name: 'Tạo Tính cách Thương hiệu (Brand Character)',
      endpoint: '/api/v1/brand-characters',
      method: 'POST',
      description: 'Tạo hồ sơ tính cách thương hiệu cho AI.',
      payload_schema: {
        name: 'string',
        description: 'string',
        tone: 'string',
        instructions: 'string',
      },
    },
    {
      name: 'Thư viện Prompt',
      endpoint: '/api/v1/prompt-libraries',
      method: 'GET',
      description: 'Lấy các mẫu Prompt AI có sẵn trong BrandLabs.',
    },
  ],
  chatbot: [
    {
      name: 'Danh sách Kênh (Platforms/Channels)',
      endpoint: '/api/v1/platforms',
      method: 'GET',
      description: 'Lấy danh sách các trang/kênh Chatbot đang quản lý (Fanpage, Zalo...).',
    },
    {
      name: 'Danh sách Kịch bản (Scenarios)',
      endpoint: '/api/v1/scenarios',
      method: 'GET',
      description: 'Lấy danh sách kịch bản trả lời tự động.',
    },
    {
      name: 'Tạo mới Kịch bản',
      endpoint: '/api/v1/scenarios',
      method: 'POST',
      description: 'Tạo kịch bản chatbot mới.',
      payload_schema: { name: 'string', triggers: 'array', steps: 'array', is_active: 'boolean' },
    },
    {
      name: 'Lịch sử Hội thoại',
      endpoint: '/api/v1/conversations',
      method: 'GET',
      description: 'Xem danh sách tin nhắn khách hàng đổ về Chatbot.',
    },
    {
      name: 'Quản lý Tri thức (Knowledge Base)',
      endpoint: '/api/v1/knowledge-base',
      method: 'GET',
      description: 'Lấy cơ sở dữ liệu tri thức của chatbot.',
    },
  ],
};

export const MASTER_API_GUIDE = `
Dưới đây là TỪ ĐIỂN API ĐA DỊCH VỤ (Master API Dictionary) mà bạn ĐƯỢC PHÉP dùng để thay đổi và vận hành toàn bộ hệ sinh thái Biztada.
Để gọi một API, bạn phải sử dụng công cụ "execute_biztada_api".

${JSON.stringify(MASTER_API_DICTIONARY, null, 2)}

[HƯỚNG DẪN QUAN TRỌNG KHI GỌI API]:
- Công cụ "execute_biztada_api" nhận thêm tham số "service" (giá trị có thể là "marketing" hoặc "chatbot").
- Các API thuộc nhóm "brandlabs" thực chất được lưu chung trong service "marketing", nên khi gọi API của BrandLabs, hãy truyền "service": "marketing".
- Thay thế biến số trên URL (ví dụ ':id') bằng ID thật từ kết quả của các lần gọi GET.
- Luôn truyền đúng payload theo payload_schema.
`;
