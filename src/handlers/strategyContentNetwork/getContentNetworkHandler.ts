import { FastifyReply, FastifyRequest } from 'fastify';

interface ContentNetworkQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategyContentNetworkRow {
  strategy_content_network_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  businessProfile: {
    industry: 'Kinh doanh trái cây tươi & thực phẩm sạch',
    products: [
      'Trái cây tươi nguyên trái (xoài, bưởi, cam, thanh long)',
      'Combo gia đình theo tuần (3–5kg mix)',
      'Hộp quà trái cây cao cấp dịp lễ',
      'Trái cây detox — giao tận nơi khu Bình Dương',
    ],
    targetAudience: [
      'Mẹ bỉm sữa 25–40 tuổi khu vực Bình Dương',
      'Gia đình hiện đại có con nhỏ quan tâm sức khỏe',
      'Chuyên gia văn phòng tìm kiếm thực phẩm sạch',
      'Người tặng quà dịp lễ tết — sính lễ cao cấp',
    ],
    expectations: [
      'Tăng nhận diện thương hiệu trong bán kính 15km quanh Thủ Dầu Một',
      'Kéo 15–30 leads/ngày từ mạng xã hội về chatbot/Zalo',
      'Tạo cộng đồng trung thành — 3 Facebook group chủ lực',
      'Đặt tiền đề để seeding account thảo luận tự nhiên, không lộ tay',
    ],
  },
  totalWeeklyPosts: 28,
  group1: {
    id: 'channel_building',
    title: 'Xây dựng & Nuôi kênh',
    description:
      'Nội dung ổn định, có giá trị giáo dục/giải trí thực sự — mục tiêu tăng follower, tăng organic reach và xây trust lâu dài. Seeding account KHÔNG can thiệp vào nhóm này để giữ tính xác thực.',
    color: 'emerald',
    weeklyPosts: 16,
    pillars: [
      {
        id: 'cn-edu',
        topic: 'Giáo dục dinh dưỡng & sức khỏe',
        purpose: 'Xây authority — người xem coi kênh là nguồn kiến thức đáng tin cậy',
        channels: ['Facebook Group', 'TikTok', 'Zalo OA'],
        frequency: '3–4 bài/tuần',
        format: ['Infographic', 'Video tip 30–60s', 'Carousel 5–7 tấm'],
        contentAngle:
          'Kiến thức thực dụng, không cần mua hàng mới áp dụng được — vd: "Top 5 trái cây tốt nhất cho da mùa nắng"',
        examples: [
          'Ăn trái cây đúng giờ nào trong ngày để hấp thu tốt nhất?',
          'Combo detox 3 ngày đơn giản cho mẹ bỉm sau sinh',
          'Cách chọn xoài cát Hòa Lộc đúng mùa, không mua hàng xử lý',
        ],
      },
      {
        id: 'cn-lifestyle',
        topic: 'Lifestyle gia đình — bữa ăn có trái cây',
        purpose: 'Tăng relatability — người xem thấy chính mình trong nội dung',
        channels: ['TikTok', 'Facebook Reels', 'Facebook Group'],
        frequency: '2–3 bài/tuần',
        format: ['Video 15–30s vlog phong cách', 'Ảnh flat-lay bữa ăn', 'Story tương tác'],
        contentAngle:
          'Cảnh thực tế nhà bếp, góc máy gần gũi — không cần setup phức tạp, không khoa trương',
        examples: [
          'Bữa sáng 10 phút cho gia đình 4 người có bé đi học',
          'Tủ lạnh nhà mình cuối tuần trông như thế nào',
          'Routine mua hàng tuần của mẹ để đủ trái cây tươi cả tuần',
        ],
      },
      {
        id: 'cn-behindscenes',
        topic: 'Hậu trường & quy trình',
        purpose: 'Xây tin tưởng về nguồn gốc — minh bạch hoá quy trình chọn hàng, kho bãi',
        channels: ['TikTok', 'Facebook Reels'],
        frequency: '1 bài/tuần',
        format: ['Video 30–60s tại kho', 'Video kiểm tra chất lượng'],
        contentAngle:
          'Góc máy thực tế tại kho, không dàn dựng — nhấn mạnh quy trình chọn lọc nghiêm ngặt',
        examples: [
          'Ngày đóng gói 200 đơn hàng cuối tuần — nhìn thế này mới hiểu tại sao tươi',
          'Cách mình chọn xoài trước khi nhập: loại nào đạt, loại nào trả lại nhà vườn',
          '5h sáng nhận hàng từ nhà vườn — quy trình kiểm tra thế nào',
        ],
      },
      {
        id: 'cn-seasonal',
        topic: 'Nội dung theo mùa vụ',
        purpose: 'Gắn kết với chu kỳ tự nhiên — tạo expectation về thời vụ để khách chủ động hỏi',
        channels: ['Facebook Group', 'Zalo OA', 'TikTok'],
        frequency: '1–2 bài/tuần theo mùa',
        format: ['Ảnh sản phẩm mùa', 'Video giới thiệu đặc sản mùa'],
        contentAngle:
          'Nhấn mạnh tính khan hiếm — loại trái cây nào vào mùa, còn bao lâu, tại sao ngon nhất đúng mùa',
        examples: [
          'Xoài cát Hòa Lộc đỉnh mùa tháng 4–6 — năm nay sản lượng giảm 30% do mưa sớm',
          'Mùa bưởi da xanh về rồi — khác hàng năm thế nào?',
          'Cuối vụ thanh long: giá tốt nhất năm nhưng chỉ còn 3 tuần',
        ],
      },
    ],
  },
  group2: {
    id: 'seeding_premise',
    title: 'Tạo tiền đề Seeding',
    description:
      'Nội dung được thiết kế để tự nhiên kéo thảo luận — seeding account đọc và phản ứng như người dùng thật. Mỗi loại content đều có "seeding trigger" rõ ràng để account biết cần phản ứng thế nào.',
    color: 'amber',
    weeklyPosts: 12,
    pillars: [
      {
        id: 'sd-review',
        topic: 'Social proof — Review thật của khách',
        purpose:
          'Kích thích người xem tự hỏi "Liệu mình có nên thử không?" — seeder vào xác nhận chất lượng',
        channels: ['Facebook Group', 'Fanpage', 'TikTok comment'],
        frequency: '3–4 bài/tuần',
        format: ['Ảnh review thật', 'Video unbox', 'Screenshot feedback Zalo'],
        contentAngle:
          'Genuine, không quá hoàn hảo — ảnh chụp vội, chữ bình thường, đúng style người thật viết',
        examples: [
          'Chị ơi vừa nhận xoài hôm qua, múi dày lắm nhưng vừa hơi chua — mua tiếp không?',
          'Order lần 2 rồi — lần này thêm cam sành thử xem sao',
          'Giao đúng giờ, đóng gói cẩn thận — tự nhiên thấy thèm thêm 1 hộp nữa',
        ],
        seedingNote:
          'Wave 1 (T+5–15 phút): seed_question hỏi giá/giao hàng khu vực. Wave 2 (T+30–60 phút): reply_confirm xác nhận chất lượng. Không dùng quá 2 seeder/bài trong group nhỏ.',
      },
      {
        id: 'sd-dilemma',
        topic: 'Câu hỏi — Vấn đề nan giải cần tư vấn',
        purpose:
          'Tạo không gian để seeder trả lời như "người trải nghiệm" — kéo reach tự nhiên qua comment',
        channels: ['Facebook Group', 'TikTok Q&A'],
        frequency: '2–3 bài/tuần',
        format: ['Post hỏi ngắn 2–3 dòng', 'Poll tương tác'],
        contentAngle:
          'Đặt câu hỏi thực tế, không cần mua hàng mới trả lời được — seeder trả lời như người có kinh nghiệm',
        examples: [
          'Mọi người hay mua trái cây ở đâu cho gia đình? Chợ hay online? Sao lại chọn chỗ đó?',
          'Bé nhà mình 3 tuổi không chịu ăn trái cây. Ai có cách nào không ạ?',
          'Trái cây nào các chị hay mua theo tuần để đủ dùng không thừa không thiếu?',
        ],
        seedingNote:
          'Seeder trả lời trong 15 phút đầu — tone tự nhiên, chia sẻ kinh nghiệm thật (không mention brand). Round 2: seeder khác mention "thử bên PHF đặt online xem" một cách tình cờ.',
      },
      {
        id: 'sd-comparison',
        topic: 'So sánh — Chợ truyền thống vs. đặt online',
        purpose:
          'Khơi gợi cuộc thảo luận nơi seeder có thể tự nhiên chia sẻ lợi ích của đặt online',
        channels: ['Facebook Group', 'Facebook Reels comment'],
        frequency: '1–2 bài/tuần',
        format: ['Infographic so sánh', 'Video ngắn góc nhìn thực tế'],
        contentAngle:
          'Không nhắm vào chợ truyền thống là xấu — đặt câu hỏi trung lập để người dùng tự so sánh',
        examples: [
          'Mua 5kg xoài ở chợ vs. đặt online — trải nghiệm thực tế của mình thế nào?',
          'Trái cây chợ vs. vườn giao tận nơi: bạn thấy khác nhau điểm nào?',
        ],
        seedingNote:
          'Seeder share trải nghiệm mua online tích cực (T+10–20 phút). Không attack chợ. Không dùng ngôn từ marketing. Nếu ai hỏi mua ở đâu thì seeder khác mới tag tên PHF.',
      },
      {
        id: 'sd-flash',
        topic: 'Flash sale & Deal giới hạn',
        purpose:
          'Tạo FOMO — seeder vào xác nhận deal tốt, thúc đẩy người đọc hành động nhanh',
        channels: ['Fanpage', 'TikTok', 'Zalo Group'],
        frequency: '2–3 bài/tuần',
        format: ['Post ảnh deal rõ giá', 'Countdown story', 'Video unboxing combo'],
        contentAngle:
          'Rõ ràng: giá, thời hạn, khu vực ship. Không vòng vo. CTA 1 hành động duy nhất.',
        examples: [
          'Flash sale 24h: Xoài cát 3kg chỉ 89k — freeship nội ô Thủ Dầu Một. Hết 8h tối nay.',
          'Combo gia đình cuối tuần: 5kg trái cây mix 149k. Chỉ 30 suất.',
        ],
        seedingNote:
          'Wave 1 (T+3–5 phút): 3–4 seeder comment hỏi ship, còn hàng không. Wave 2 (T+15–30 phút): 5–8 seeder xác nhận đã mua, đang chờ giao. Cố ý để 1 seeder xác nhận khu vực ship rộng.',
      },
      {
        id: 'sd-community',
        topic: 'Nội dung cộng đồng — chia sẻ nội bộ group',
        purpose:
          'Nuôi group bằng content giá trị cao — seeder giúp nội dung sống lâu bằng cách reply đẩy bài lên',
        channels: ['Facebook Group'],
        frequency: '1–2 bài/tuần',
        format: ['Bài viết dài chia sẻ kinh nghiệm', 'Album ảnh sinh hoạt'],
        contentAngle:
          'Porter đăng bài như thành viên thật của group — không phải admin fanpage đăng quảng cáo',
        examples: [
          'Tuần này mình thử làm sinh tố bưởi + dưa leo cho bé uống sáng — kết quả bất ngờ',
          'Ai ở Thủ Dầu Một có chỗ mua trái cây sạch tin cậy không? Mình vừa chuyển về đây',
        ],
        seedingNote:
          'Porter (tài khoản đăng bài) ≠ seeder. Porter đăng content. Seeder comment phản ứng trong 20 phút đầu để đẩy bài lên feed group. Mỗi bài cần ít nhất 3 comment seeder trong 30 phút đầu.',
      },
    ],
  },
  crossGroupSynergy:
    'Group 1 xây dựng uy tín kênh (khán giả quen mặt → dễ tin); Group 2 kích hoạt thảo luận trên nền uy tín đó → seeding tham gia thảo luận tự nhiên hơn 3–5x so với kênh không có nội dung nền.',
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

function normalizePayload(payload: unknown): unknown {
  let parsed: Record<string, unknown> | null = null;
  if (typeof payload === 'string') {
    try { parsed = JSON.parse(payload) as Record<string, unknown>; } catch { /* use fallback */ }
  } else if (payload && typeof payload === 'object') {
    parsed = payload as Record<string, unknown>;
  }
  if (!parsed) return FALLBACK_DEMO_DATA;
  return { ...FALLBACK_DEMO_DATA, ...parsed };
}

async function getByGuest(request: FastifyRequest, guestId: string): Promise<StrategyContentNetworkRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyContentNetworkRow[]>`
    SELECT strategy_content_network_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_content_network
    WHERE deleted_at IS NULL AND guest_id = ${guestId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByUser(request: FastifyRequest, businessId: string, userId: string): Promise<StrategyContentNetworkRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyContentNetworkRow[]>`
    SELECT strategy_content_network_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_content_network
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id = ${userId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByBusiness(request: FastifyRequest, businessId: string): Promise<StrategyContentNetworkRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyContentNetworkRow[]>`
    SELECT strategy_content_network_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_content_network
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id IS NULL
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: ContentNetworkQuery }>,
  reply: FastifyReply,
) {
  const queryGuestId = sanitizeId(request.query.guestId);
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyContentNetworkRow | null = null;

  if (queryGuestId) {
    selected = await getByGuest(request, queryGuestId);
    if (selected) source = 'guest';
  }
  if (!selected && effectiveUserId) {
    selected = await getByUser(request, effectiveBusinessId, effectiveUserId);
    if (selected) source = 'user';
  }
  if (!selected) {
    selected = await getByBusiness(request, effectiveBusinessId);
    if (selected) source = selected.business_id === 'demo' ? 'demo' : 'business';
  }
  if (!selected && effectiveBusinessId !== 'demo') {
    selected = await getByBusiness(request, 'demo');
    if (selected) source = 'demo';
  }

  return reply.send({
    success: true,
    data: normalizePayload(selected?.payload),
    meta: {
      source,
      guestId: selected?.guest_id ?? queryGuestId ?? null,
      businessId: effectiveBusinessId,
      userId: effectiveUserId ?? null,
      usedFallbackDemo: !selected,
      updatedAt: selected?.updated_at?.toISOString() ?? null,
    },
  });
}
