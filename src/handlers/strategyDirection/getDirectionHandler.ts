import { FastifyReply, FastifyRequest } from 'fastify';

interface DirectionQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategyDirectionRow {
  strategy_direction_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  businessSummary: {
    name: 'Phú Hòa Fresh',
    industry: 'Kinh doanh trái cây tươi & thực phẩm sạch',
    location: 'Bình Dương — Thủ Dầu Một',
    stage: 'Mở rộng cộng đồng địa phương — hướng tới hệ thống hóa vận hành bán hàng',
  },
  strategicNorth: {
    headline:
      'Trở thành thương hiệu trái cây sạch đáng tin cậy nhất tại Bình Dương — xây dựng tệp khách hàng mua định kỳ dựa trên uy tín chất lượng, không cạnh tranh bằng giá.',
    rationale:
      'Phú Hòa Fresh có lợi thế về chất lượng và nguồn gốc rõ ràng — nhưng lợi thế đó chỉ phát huy được khi đúng người biết đến, tin tưởng và quay lại mua. Toàn bộ kế hoạch xoay quanh một thông điệp nhất quán: tươi — sạch — nguồn gốc minh bạch — giao tận nơi. Chu kỳ 5 module dưới đây là cách triển khai thông điệp đó thành hành động cụ thể, liên tục và có hệ thống.',
  },
  conceptDetail: {
    communicationGoal:
      'Xây dựng nhận thức thương hiệu Phú Hòa Fresh = "trái cây sạch đáng tin" trong cộng đồng gia đình trẻ tại Bình Dương. Không quảng bá kiểu bán hàng — đặt vị trí như người tư vấn dinh dưỡng đáng tin cậy. Khi gia đình Bình Dương nghĩ đến trái cây sạch, Phú Hòa Fresh là cái tên đầu tiên. Đo bằng: lượt follow Zalo OA, tần suất hỏi giá tự nhiên, tỷ lệ khách mua lần 2.',
    deploymentStyle:
      'Ấm áp, gần gũi, thực tế — không khoa trương. Nội dung thiên về câu chuyện thật: vườn thật, người thật, hàng thật. Tone như lời tư vấn của người bán hàng uy tín lâu năm, không phải quảng cáo. Hình ảnh tươi sáng thực tế tại vườn và điểm bán, không dùng ảnh stock. Video 30-60s kiểu "hôm nay vườn có gì", "cách chọn sầu riêng chuẩn", "xoài mùa về rồi".',
    channelCoverage:
      'Ưu tiên: Zalo OA (kênh chốt đơn chính) + Facebook Groups địa phương Bình Dương (kênh seeding cộng đồng). Thứ cấp: Fanpage Facebook (đăng đều brand content). TikTok: thử nghiệm nếu có nhân sự, không ép. Không nên đầu tư Google Ads hay SEO giai đoạn này — ngân sách tập trung community seeding và Zalo automation để xây tệp khách định kỳ trong vùng giao hàng.',
    deploymentTendency:
      'Phú Hòa Fresh thuộc nhóm XÂY KÊNH CỘNG ĐỒNG — không phải SĂN LEADS. Lý do: trái cây sạch là nhu cầu định kỳ hàng tuần — khách trung thành quan trọng hơn khách mới. Ngược với mô hình môi giới BĐS (săn leads đang có nhu cầu ngay, xây kênh không có ý nghĩa nhiều) hay sản phẩm thời vụ (chạy ads peak season). Với Phú Hòa Fresh: xây tệp Zalo OA lớn trong vùng giao hàng → duy trì tiếp xúc đều qua content → chuyển dần thành khách định kỳ. Module 1 (Content) và Module 5 (Loyalty) có trọng số ngang Module 3 (Chatbot) trong chu kỳ.',
  },
  funnelPhases: [
    {
      id: 'ph1-content-engine',
      phaseId: 1,
      icon: '🎨',
      title: 'Content & Brand Engine',
      description:
        'Sản xuất nội dung định vị Phú Hòa Fresh là chuyên gia trái cây sạch tại Bình Dương: review trái cây theo mùa vụ, câu chuyện về nguồn hàng và nhà vườn, tips chọn trái cây sạch cho gia đình, công dụng dinh dưỡng và gợi ý cách dùng (sinh tố, salad, ăn dặm cho bé). Nội dung đăng đều đặn trên Zalo OA và Fanpage.',
      tools: ['BrandLabs AI', 'Auto-Publishing', 'Brand Persona'],
      measurable:
        'Cung cấp nội dung cho toàn bộ chu kỳ vận hành — không có content nhất quán về chất lượng và nguồn gốc, thông điệp của Phú Hòa Fresh không đến được với khách hàng mục tiêu.',
      color: 'emerald',
    },
    {
      id: 'ph2-amplification',
      phaseId: 2,
      icon: '🌐',
      title: 'Social Amplification Network',
      description:
        'Đưa nội dung từ Module 1 đến đúng tệp khách hàng tại Bình Dương: nhóm mẹ & bé, gia đình trẻ quan tâm sức khỏe, hội ăn chay, cộng đồng healthy lifestyle tại Thủ Dầu Một và vùng lân cận. Seeding kịch bản hỏi về nguồn gốc, giá cả, chia sẻ trải nghiệm — tạo social proof tự nhiên từ cộng đồng địa phương.',
      tools: ['Matrix Seeding', 'Porter Network', 'Demographic Targeting'],
      measurable:
        'Đưa thông điệp về chất lượng và uy tín của Phú Hòa Fresh vào đúng cộng đồng đang có nhu cầu — tạo điểm tiếp xúc để Module 3 chuyển đổi thành đơn hàng.',
      color: 'cyan',
    },
    {
      id: 'ph3-conversion-gateway',
      phaseId: 3,
      icon: '🤖',
      title: 'AI Conversion Gateway',
      description:
        'Chatbot tư vấn chọn trái cây theo nhu cầu cụ thể của từng khách: trái cây cho bé ăn dặm, cho người bệnh tiểu đường, cho người già, làm sinh tố giảm cân... Chatbot lấy địa chỉ giao hàng, xác nhận đơn và hỗ trợ 24/7 — không bỏ sót khách nhắn ngoài giờ làm việc.',
      tools: ['AI Chatbot', 'Intent Recognition', 'Multi-channel Integration'],
      measurable:
        'Biến người quan tâm (từ Module 2) thành đơn hàng có địa chỉ thực tế — đầu vào cụ thể để Module 4 phân loại và chốt.',
      color: 'amber',
    },
    {
      id: 'ph4-pipeline-engine',
      phaseId: 4,
      icon: '🔗',
      title: 'Pipeline & Closing Engine',
      description:
        'Phân loại leads theo khu vực giao hàng, thiết lập đơn định kỳ hàng tuần cho khách mua thường xuyên. ZNS tự động nhắc khách chưa chốt sau 2 giờ, telesale follow up đơn lớn hoặc khách hỏi nhiều chưa quyết định. Không bỏ lọt bất kỳ tiếp xúc nào vào phễu trống.',
      tools: ['CRM Pipeline', 'ZNS Automation', 'Sales Workflow'],
      measurable:
        'Biến leads từ Module 3 thành giao dịch hoàn chỉnh và khởi động hành trình khách hàng thường xuyên — đầu ra là danh sách khách đã mua để Module 5 chăm sóc.',
      color: 'violet',
    },
    {
      id: 'ph5-growth-loop',
      phaseId: 5,
      icon: '♾️',
      title: 'Loyalty & Growth Loop',
      description:
        'Nhắc khách theo mùa vụ trái cây (xoài mùa, sầu riêng, thanh long...), thông báo hàng mới về, ưu đãi đặc biệt cho khách mua định kỳ. Kích hoạt chương trình giới thiệu bạn bè — khách quen Phú Hòa Fresh trở thành kênh quảng cáo tự nhiên trong cộng đồng địa phương.',
      tools: ['Broadcast Automation', 'Loyalty Tagging', 'Re-marketing'],
      measurable:
        'Giữ chân khách từ Module 4, biến người mua lẻ thành khách định kỳ — và khách thân thiết thành nguồn giới thiệu mới, khép kín chu kỳ tăng trưởng.',
      color: 'rose',
    },
  ],
  implementationLogic:
    'Chu kỳ chạy liên tục: content định vị thương hiệu → khuếch đại đúng tệp địa phương → chatbot chuyển đổi thành đơn → CRM chốt và tạo khách thường xuyên → loyalty kéo khách quay lại và giới thiệu mới. Toàn bộ phục vụ một mục tiêu duy nhất: Phú Hòa Fresh trở thành lựa chọn đầu tiên của gia đình Bình Dương khi cần trái cây sạch.',
  keyAssumptions: [
    'Zalo OA, Fanpage đã được kết nối vào hệ thống BizTada trước khi vận hành',
    'Knowledge Base Chatbot được cài sẵn kịch bản tư vấn theo loại trái cây và nhu cầu khách',
    'Danh mục sản phẩm và khu vực giao hàng được cập nhật định kỳ vào hệ thống',
  ],
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Querystring: DirectionQuery }>,
  reply: FastifyReply,
) {
  const { guestId, businessId, userId } = request.query;
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(guestId);
  const effectiveUserId = authUserId ?? sanitizeId(userId);
  const effectiveBusinessId = sanitizeId(businessId) ?? 'demo';

  let source: SourceType = 'demo';
  let rows: StrategyDirectionRow[] = [];

  if (effectiveGuestId) {
    rows = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_direction
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'guest';
  } else if (effectiveUserId) {
    rows = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_direction
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'user';
  } else if (effectiveBusinessId !== 'demo') {
    rows = await request.prisma.$queryRaw<StrategyDirectionRow[]>`
      SELECT strategy_direction_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_direction
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'business';
  }

  if (rows.length > 0) {
    const row = rows[0];
    return reply.send({
      success: true,
      data: row.payload,
      meta: {
        source,
        id: row.strategy_direction_id,
        businessId: row.business_id,
        userId: row.user_id,
        guestId: row.guest_id,
        isDemo: Boolean(row.is_demo),
        updatedAt: row.updated_at,
        usedFallbackDemo: false,
      },
    });
  }

  return reply.send({
    success: true,
    data: FALLBACK_DEMO_DATA,
    meta: {
      source: 'demo',
      id: null,
      businessId: effectiveBusinessId,
      userId: effectiveUserId,
      guestId: effectiveGuestId,
      isDemo: true,
      updatedAt: new Date().toISOString(),
      usedFallbackDemo: true,
    },
  });
}
