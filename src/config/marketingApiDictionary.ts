export const MARKETING_API_DICTIONARY = [
  {
    name: 'Tạo tài khoản Marketing',
    endpoint: '/api/v1/accounts',
    method: 'POST',
    description:
      'Tạo một tài khoản mạng xã hội mới trong hệ thống (Facebook, TikTok, v.v.). AI chỉ có thể thêm tài khoản nếu người dùng cấp đủ thông tin.',
    payload_schema: {
      platform: 'string (facebook, tiktok)',
      account_name: 'string',
      credentials: 'object (chứa cookie, token...)',
      status: 'string (active, inactive)',
    },
  },
  {
    name: 'Lấy danh sách Workflow',
    endpoint: '/api/v1/workflows',
    method: 'GET',
    description: 'Lấy toàn bộ các luồng công việc (workflows) hiện có của doanh nghiệp.',
  },
  {
    name: 'Tạo mới Workflow',
    endpoint: '/api/v1/workflows',
    method: 'POST',
    description: 'Tạo mới một Workflow. Yêu cầu body chứa thông tin workflow.',
    payload_schema: {
      name: 'string',
      description: 'string',
      nodes: 'array',
      edges: 'array',
    },
  },
  {
    name: 'Cập nhật Workflow',
    endpoint: '/api/v1/workflows/:id',
    method: 'PUT',
    description: "Chỉnh sửa nội dung Workflow. Yêu cầu thay thế ':id' bằng ID thật của workflow.",
    payload_schema: {
      name: 'string',
      description: 'string',
      nodes: 'array',
      edges: 'array',
    },
  },
  {
    name: 'Chạy ngay Workflow (Run Now)',
    endpoint: '/api/v1/workflows/:id/run-now',
    method: 'POST',
    description:
      "Kích hoạt ép chạy ngay lập tức một Workflow. Yêu cầu thay thế ':id' bằng ID thật.",
  },
  {
    name: 'Tạo hồ sơ AI cho tài khoản',
    endpoint: '/api/v1/accounts/:id/generate-ai-profile',
    method: 'POST',
    description: 'Tạo mới một tính cách và hồ sơ AI cho tài khoản dựa trên ID.',
  },
];

export const MARKETING_API_GUIDE = `
Dưới đây là TỪ ĐIỂN API (API Dictionary) mà bạn ĐƯỢC PHÉP dùng để thay đổi hệ thống của người dùng.
Để gọi một API trong danh sách này, bạn phải sử dụng công cụ "execute_marketing_api".

${JSON.stringify(MARKETING_API_DICTIONARY, null, 2)}

[LƯU Ý QUAN TRỌNG KHI GỌI API]:
- Nếu API có chứa tham số trên URL như ':id', BẠN PHẢI thay thế ':id' bằng một ID thật hợp lệ lấy từ các thao tác trước đó.
- KHÔNG BAO GIỜ bịa ra ID. Nếu chưa có ID, hãy gọi API GET để lấy danh sách ID trước.
- Tuyệt đối chỉ gửi payload khớp với cấu trúc payload_schema được quy định ở trên.
`;
