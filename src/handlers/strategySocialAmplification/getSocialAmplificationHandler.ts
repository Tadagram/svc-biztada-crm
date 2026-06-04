import { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';

interface SocialAmplificationQuery {
  guestId?: string;
  businessId?: string;
  userId?: string;
}

type SourceType = 'guest' | 'user' | 'business' | 'demo';

interface SocialAmplificationRow {
  strategy_social_amplification_id: string;
  business_id: string;
  user_id: string | null;
  guest_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

// TODO: Replace with actual mock data from frontend
const FALLBACK_DEMO_DATA = {
  features: [
  {
    id: 'methodology', icon: '🎯', label: 'Phương thức triển khai', badge: 'SEEDING DYNAMICS',
    desc: 'Seeder tương tác đeo bám các bài của poster (Like, Share, comment, reply...) để tạo sự sôi động tự nhiên.',
    color: '#34d399'
  },
  {
    id: 'poster_plan', icon: '🗂️', label: 'Cụm Chủ Đề (Topics)', badge: 'ANCHOR CONTENT',
    desc: 'Các nhóm chủ đề mở rộng, định hướng nội dung đa kênh nhắm đến nhiều tệp khách hàng tiềm năng.',
    color: '#60a5fa'
  },
  {
    id: 'matrix_details', icon: '🕸️', label: 'Matrix Tương Tác', badge: 'INTERACTION GRAPH',
    desc: 'Sơ đồ luồng tương tác và phân bổ tỷ trọng theo mục tiêu thao túng tâm lý.',
    color: '#f472b6'
  },
],
  posterTopics: [
  { 
    theme: 'Social Proof & Khách thật', 
    ratio: '25%', frequency: '3-4 bài/tuần', 
    details: 'Review trái cây thực tế, hình ảnh khách hàng nhận hàng, video đập hộp, phản hồi khen ngợi.', 
    objective: 'Xây dựng niềm tin, chứng thực chất lượng, thúc đẩy ra quyết định.',
    channels: ['FB Group', 'Fanpage', 'TikTok']
  },
  { 
    theme: 'Kiến thức & Dinh dưỡng (Giáo dục)', 
    ratio: '15%', frequency: '2-3 bài/tuần', 
    details: 'Cách bảo quản trái cây, lợi ích sức khỏe, mẹo chọn quả ngon, thực đơn dinh dưỡng cho gia đình.', 
    objective: 'Định vị chuyên gia, tạo lý do để khách hàng theo dõi và lưu bài viết.',
    channels: ['Zalo OA', 'FB Group', 'Fanpage']
  },
  { 
    theme: 'Đời sống gia đình & Nuôi con (Mẹ Bỉm)', 
    ratio: '15%', frequency: '2-3 bài/tuần', 
    details: 'Thực đơn ăn dặm từ trái cây cho bé, cách giúp trẻ lười ăn trái cây, câu chuyện làm mẹ bỉm.', 
    objective: 'Tạo sự đồng cảm cực mạnh với tệp khách hàng chính (Gia đình trẻ, Mẹ bỉm sữa).',
    channels: ['FB Group', 'Zalo OA']
  },
  { 
    theme: 'Tin tức & Đời sống Local (Bình Dương)', 
    ratio: '10%', frequency: '1-2 bài/tuần', 
    details: 'Cập nhật tình hình thời tiết, địa điểm vui chơi cuối tuần tại Thủ Dầu Một, mẹo vặt địa phương.', 
    objective: 'Kéo tương tác tự nhiên, định vị thương hiệu gắn bó sâu sát với cộng đồng địa phương.',
    channels: ['FB Group', 'Fanpage']
  },
  { 
    theme: 'Dân văn phòng & Healthy Lifestyle', 
    ratio: '15%', frequency: '2-3 bài/tuần', 
    details: 'Mẹo ăn vặt không béo nơi công sở, sinh tố detox buổi sáng, set trái cây cắt sẵn văn phòng.', 
    objective: 'Mở rộng tệp khách hàng tiềm năng là dân văn phòng, tăng tần suất order hàng ngày.',
    channels: ['TikTok', 'Fanpage']
  },
  { 
    theme: 'Khuyến mãi & Kích cầu (Sales)', 
    ratio: '10%', frequency: '1-2 bài/tuần', 
    details: 'Flash deal giờ vàng, combo tiết kiệm cuối tuần, freeship, ưu đãi đặc quyền hội viên.', 
    objective: 'Thúc đẩy mua hàng ngay lập tức (FOMO), giải phóng hàng tồn hoặc hàng mùa vụ.',
    channels: ['Fanpage', 'Zalo OA']
  },
  { 
    theme: 'Behind The Scenes (Kho & Vườn)', 
    ratio: '10%', frequency: '1-2 bài/tuần', 
    details: 'Video thu hoạch tại vườn, quy trình đóng gói đảm bảo vệ sinh, hàng mới cập bến.', 
    objective: 'Minh bạch nguồn gốc xuất xứ, chứng minh năng lực cung ứng và độ tươi mới.',
    channels: ['TikTok', 'Fanpage']
  },
],
  seedingMatrix: [
  {
    id: 'wave_1', name: 'Wave 1: Khơi mào (Tò mò)', time: '0–30 phút đầu', ratio: '40%',
    role: 'Nhóm "Mẹ Bỉm Sữa"',
    action: 'Comment hỏi dò, thả Like/Wow, tag bạn bè.',
    purpose: 'Phá băng bài viết, kích thích thuật toán Facebook/TikTok phân phối.',
    example: '"Mua ở đâu vậy chị?", "Trái này cho bé ăn dặm được không?"'
  },
  {
    id: 'wave_2', name: 'Wave 2: Bồi đắp (Học hỏi & Đồng cảm)', time: '1–2 giờ sau', ratio: '30%',
    role: 'Nhóm "Chuyên gia / Reviewer"',
    action: 'Reply comment Wave 1, đưa ra phân tích sâu, chia sẻ kiến thức.',
    purpose: 'Tạo niềm tin chuyên sâu, xóa bỏ sự nghi ngờ của khách thật.',
    example: '"Mình hay mua ở đây, giá nhỉnh hơn chợ nhưng bù lại sạch, đóng gói kỹ."'
  },
  {
    id: 'wave_3', name: 'Wave 3: Kích động (Chốt sales)', time: '2–4 giờ sau', ratio: '20%',
    role: 'Nhóm "Khách mua chung"',
    action: 'Rủ rê mua chung, xin review thực tế, khẳng định lại chất lượng.',
    purpose: 'Thao túng tâm lý đám đông, tạo hiệu ứng khan hiếm hoặc FOMO.',
    example: '"Gom mua chung không mấy bà, đang có mã freeship nè!"'
  },
  {
    id: 'wave_4', name: 'Wave 4: Duy trì (Retention)', time: 'Ngày hôm sau', ratio: '10%',
    role: 'Nhóm "Khách hàng cũ"',
    action: 'Quay lại feedback sau khi nhận hàng hoặc tag thêm người mới.',
    purpose: 'Tạo vòng lặp nội dung tự nhiên, bài viết liên tục được bump lên newsfeed.',
    example: '"Vừa nhận hàng sáng nay, tươi rói luôn shop ơi!"'
  }
],
};


function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

export async function handler(
  request: FastifyRequest<{ Querystring: SocialAmplificationQuery }>,
  reply: FastifyReply,
) {
  const { guestId, businessId, userId } = request.query;
  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveGuestId = sanitizeId(guestId);
  const effectiveUserId = authUserId ?? sanitizeId(userId);
  const effectiveBusinessId = sanitizeId(businessId) ?? 'demo';

  let source: SourceType = 'demo';
  let rows: SocialAmplificationRow[] = [];

  if (effectiveGuestId) {
    rows = await request.prisma.$queryRaw<SocialAmplificationRow[]>`
      SELECT strategy_social_amplification_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_social_amplification
      WHERE deleted_at IS NULL AND guest_id = ${effectiveGuestId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'guest';
  } else if (effectiveUserId) {
    rows = await request.prisma.$queryRaw<SocialAmplificationRow[]>`
      SELECT strategy_social_amplification_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_social_amplification
      WHERE deleted_at IS NULL AND business_id = ${effectiveBusinessId} AND user_id = ${effectiveUserId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    source = 'user';
  } else if (effectiveBusinessId !== 'demo') {
    rows = await request.prisma.$queryRaw<SocialAmplificationRow[]>`
      SELECT strategy_social_amplification_id, business_id, user_id, guest_id, payload, is_demo, updated_at
      FROM strategy_social_amplification
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
        id: row.strategy_social_amplification_id,
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
