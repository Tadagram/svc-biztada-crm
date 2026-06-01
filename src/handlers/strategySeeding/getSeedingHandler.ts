import { FastifyReply, FastifyRequest } from 'fastify';

interface SeedingQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface StrategySeedingRow {
  strategy_seeding_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  porterAccountsTotal: 6,
  seedingAccountsTotal: 35,
  demographicsTarget: [
    'Nữ 25-40 tuổi, khu vực Bình Dương/HCM',
    'Quan tâm sức khỏe, gia đình, thực phẩm sạch',
    'Thu nhập 8–20 triệu/tháng',
  ],
  warmupWeeks: 2,
  phases: [
    {
      platform: 'Facebook',
      accountCount: 20,
      targetGroups: ['Hội mẹ bỉm sữa Bình Dương', 'Ăn uống Thủ Dầu Một', 'Sống khỏe mỗi ngày'],
      commentFrequency: '3–5 comment/ngày/account',
      commentTypes: ['Hỏi giá combo', 'Review tích cực về chất lượng', 'Tag bạn bè cùng quan tâm'],
      demographics: ['Ảnh thật gia đình, 3+ tháng tuổi, 80+ bạn bè, địa chỉ Bình Dương'],
    },
    {
      platform: 'Zalo',
      accountCount: 15,
      targetGroups: ['Hội mẹ Bình Dương', 'Phụ huynh trường tiểu học khu vực'],
      commentFrequency: '2–3 comment/ngày/account',
      commentTypes: ['Hỏi giao hàng khu vực', 'Chia sẻ trải nghiệm dùng cho gia đình'],
      demographics: ['Số điện thoại thật, avatar ảnh gia đình, tham gia nhóm 60+ ngày'],
    },
  ],
  matrix: [
    { type: 'seed_question', ratio: '40%', tone: 'curious', timing: 'trong 15 phút đầu', example: 'Trái cây ở đây có giao tận nơi khu vực Thủ Dầu Một không ạ?' },
    { type: 'reply_confirm', ratio: '30%', tone: 'positive', timing: 'sau 30–60 phút', example: 'Mình order 3 lần rồi, tươi lắm chị ơi, giao nhanh nữa!' },
    { type: 'tag_friend', ratio: '20%', tone: 'recommend', timing: 'sau 1–2 giờ', example: '@[tên bạn] ơi mày đang tìm trái cây sạch thì vào đây đi' },
    { type: 'review_detail', ratio: '10%', tone: 'authentic', timing: 'sau 3–6 giờ', example: 'Vừa nhận 5kg xoài cát Hòa Lộc, múi dày ngọt vừa. Đóng gói cẩn thận, sẽ order tiếp.' },
  ],
  notes: 'Không seeding đồng loạt — trải đều trong 4–6 giờ/bài. Mỗi account chỉ seeding 1 bài/ngày của cùng 1 fanpage.',
  campaigns: [
    {
      id: 'camp-community',
      name: 'Nuôi Cộng Đồng',
      objective: 'Tăng trust + membership cho 3 group Facebook chủ lực',
      porterPlacement: [
        { channel: 'Group Sống Khỏe Mỗi Ngày', porterCount: 2, action: 'Đăng bài gốc 2 lần/ngày', postTopics: ['Tip dinh dưỡng trái cây theo mùa', 'Công thức nước ép detox đơn giản'], timing: '7h và 20h' },
        { channel: 'Group Phụ Nữ Đẹp Từ Bên Trong', porterCount: 2, action: 'Đăng bài gốc 2 lần/ngày', postTopics: ['Beauty routine với trái cây', 'Giữ dáng sau sinh nhẹ nhàng'], timing: '8h và 21h' },
        { channel: 'Group Bếp Nhà Có Trái Cây', porterCount: 2, action: 'Đăng bài gốc 2 lần/ngày', postTopics: ['Thực đơn gia đình có trẻ nhỏ', 'Bữa phụ lành mạnh cho bé'], timing: '7h30 và 20h30' },
      ],
      seedingWaves: [
        { wave: 1, triggerTime: 'T+5–15 phút', accountCount: 3, behavior: 'seed_question', personaMapping: 'Mẹ Bỉm Sữa', sampleComment: 'Trái cây ở đây đặt online có tươi không ạ? Mình hay mua cho bé ăn sáng nên cần đảm bảo lắm.' },
        { wave: 2, triggerTime: 'T+30–60 phút', accountCount: 5, behavior: 'reply_confirm', personaMapping: 'Chuyên Gia Dinh Dưỡng', sampleComment: 'Đã order 2 lần ở đây rồi, nguồn gốc rõ ràng, xoài cát Hòa Lộc đúng vị, không bị nhão.' },
        { wave: 3, triggerTime: 'T+2–3 giờ', accountCount: 4, behavior: 'tag_friend', personaMapping: 'Reviewer Local', sampleComment: '@[bạn thân] đây rồi, chỗ này giao tận nhà khu Thủ Dầu Một nè, mình đặt được á!' },
      ],
      accounts: { porter: 6, seeding: 12 },
    },
    {
      id: 'camp-sales',
      name: 'Chiến Dịch Sales Fanpage',
      objective: 'Thúc đẩy đặt hàng qua fanpage và chatbot Zalo',
      porterPlacement: [
        { channel: 'Fanpage Sàn Sale Thủ Dầu Một', porterCount: 2, action: 'Comment đặt hàng sớm trong 5 phút đầu + hỏi deal mới', postTopics: ['Flash sale theo khung giờ', 'Combo tiết kiệm gia đình'], timing: 'Trong 5 phút ngay sau bài đăng' },
      ],
      seedingWaves: [
        { wave: 1, triggerTime: 'T+3–5 phút', accountCount: 4, behavior: 'seed_question', personaMapping: 'Reviewer Local', sampleComment: 'Giá combo 3kg bao nhiêu vậy chị? Ship khu Bình Hòa có không?' },
        { wave: 2, triggerTime: 'T+15–30 phút', accountCount: 8, behavior: 'reply_confirm', personaMapping: 'Gia Đình Hiện Đại', sampleComment: 'Freeship cả tuần này, mình order 2 lần tuần trước — hàng tươi, giao đúng giờ lắm.' },
        { wave: 3, triggerTime: 'T+1–2 giờ', accountCount: 5, behavior: 'tag_friend', personaMapping: 'Mẹ Bỉm Sữa', sampleComment: '@Lan ơi mày đang tìm trái cây sạch cho bé không? Chỗ này order về đợi nha.' },
        { wave: 4, triggerTime: 'T+4–6 giờ', accountCount: 3, behavior: 'review_detail', personaMapping: 'Chuyên Gia Dinh Dưỡng', sampleComment: 'Vừa nhận 5kg xoài cát Hòa Lộc: múi dày không xơ, ngọt đều, đóng gói giữ lạnh cẩn thận. Sẽ order tiếp tuần tới.' },
      ],
      accounts: { porter: 2, seeding: 20 },
    },
    {
      id: 'camp-tiktok',
      name: 'Viral TikTok',
      objective: 'Tăng views + kéo traffic về link Zalo/fanpage',
      porterPlacement: [
        { channel: 'TikTok 1 / 2 / 3 (3 kênh luân phiên)', porterCount: 2, action: 'Comment hỏi đặt hàng trong 5 phút đầu', postTopics: ['Unbox đơn hàng tươi ngon', 'Tip chọn trái cây ngon theo mùa'], timing: 'Ngay sau khi upload video' },
      ],
      seedingWaves: [
        { wave: 1, triggerTime: 'T+2–5 phút', accountCount: 3, behavior: 'seed_question', personaMapping: 'Mẹ Bỉm Sữa', sampleComment: 'Mua ở đâu vậy bạn? Có ship khu Bình Dương không ạ?' },
        { wave: 2, triggerTime: 'T+15–30 phút', accountCount: 5, behavior: 'reply_confirm', personaMapping: 'Reviewer Local', sampleComment: 'Giao nhanh lắm, tươi hơn ngoài chợ nhiều, mình order 3 lần rồi!' },
        { wave: 3, triggerTime: 'T+1 giờ', accountCount: 4, behavior: 'tag_friend', personaMapping: 'Gia Đình Hiện Đại', sampleComment: '@Nam ơi mình order cho nhà mình được á, link trong bio nè!' },
      ],
      accounts: { porter: 2, seeding: 12 },
    },
  ],
  accountMaintenance: {
    warmupActivities: [
      'Đăng 1–2 bài đời sống/ngày: ảnh ăn uống, check-in quán cà phê, cảnh đẹp Bình Dương — KHÔNG liên quan trái cây',
      'Kết bạn 5–10 người/ngày từ mạng lưới bạn bè địa phương khu Thủ Dầu Một, Thuận An',
      'Like và comment 3–5 bài/ngày từ bạn bè trong mạng lưới đã kết nối',
      'Tham gia 2–3 group địa phương, comment tự nhiên (không seeding) trong 1 tuần đầu',
      'Check-in 1 lần/tuần tại địa điểm nổi tiếng Thủ Dầu Một',
    ],
    activeAccountBehavior: [
      'Seeding tối đa 3 bài/ngày trên cùng 1 fanpage — phân bố đều khung sáng/trưa/tối',
      'Không comment 2 bài liên tiếp trên cùng fanpage trong vòng 30 phút',
      'Mỗi 3 ngày đăng 1 bài đời sống cá nhân để giữ profile trông tự nhiên',
      'Luân phiên role: 1 ngày seeding fanpage → 1 ngày seeding group → tránh lặp pattern',
    ],
  },
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
  // Merge: fill missing new fields from FALLBACK so old DB records stay compatible
  return { ...FALLBACK_DEMO_DATA, ...parsed };
}

async function getByGuest(request: FastifyRequest, guestId: string): Promise<StrategySeedingRow | null> {
  const rows = await request.prisma.$queryRaw<StrategySeedingRow[]>`
    SELECT strategy_seeding_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_seeding
    WHERE deleted_at IS NULL AND guest_id = ${guestId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByUser(request: FastifyRequest, businessId: string, userId: string): Promise<StrategySeedingRow | null> {
  const rows = await request.prisma.$queryRaw<StrategySeedingRow[]>`
    SELECT strategy_seeding_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_seeding
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id = ${userId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getByBusiness(request: FastifyRequest, businessId: string): Promise<StrategySeedingRow | null> {
  const rows = await request.prisma.$queryRaw<StrategySeedingRow[]>`
    SELECT strategy_seeding_id, business_id, user_id, guest_id, payload, is_demo, updated_at
    FROM strategy_seeding
    WHERE deleted_at IS NULL AND business_id = ${businessId} AND user_id IS NULL
    ORDER BY updated_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: SeedingQuery }>,
  reply: FastifyReply,
) {
  const queryGuestId = sanitizeId(request.query.guestId);
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategySeedingRow | null = null;

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
