import { FastifyReply, FastifyRequest } from 'fastify';

interface ActionPlanQuery {
  businessId?: string;
  userId?: string;
}

type SourceType = 'user' | 'business' | 'demo';

interface StrategyActionPlanRow {
  strategy_action_plan_id: string;
  business_id: string;
  user_id: string | null;
  payload: unknown;
  is_demo: number | boolean;
  updated_at: Date;
}

const FALLBACK_DEMO_DATA = {
  timelineWeeks: [5, 6, 7, 8, 9, 10, 11, 12],
  phases: [
    {
      name: '1. Thiet lap he thong ban dau',
      tasks: [
        {
          name: 'Khao sat group lien quan tu khoa Thu Dau Mot, Binh Duong',
          desc: 'Nghien cuu nguoi dung dang tap trung o group nao, lap danh sach group co trao doi manh.',
          goal: 'Danh sach group va danh gia muc do tuong tac.',
          qty: 'N/A',
          timeline: 'Tuan 5-6',
          startWeek: 5,
          endWeek: 6,
        },
        {
          name: 'Xay dung group cong dong tren Facebook',
          desc: 'Mua group moi, tai su dung noi dung, gan thuong hieu PHF tai tro cong dong va day 3 group chu luc.',
          goal: '3 group thanh vien tot, noi dung du manh.',
          qty: '3 Groups',
          timeline: 'Tuan 6-7',
          startWeek: 6,
          endWeek: 7,
        },
        {
          name: 'Thiet lap tai khoan Facebook ca nhan',
          desc: 'Mua tai khoan cu, len bai nen, ket ban moi tai Binh Duong de phuc vu seeding an toan.',
          goal: '20 tai khoan co lich su hoat dong tot.',
          qty: '20 FB ca nhan',
          timeline: 'Tuan 6-8',
          startWeek: 6,
          endWeek: 8,
        },
        {
          name: 'Thiet lap fanpage ca nhan ve tinh',
          desc: 'Moi tai khoan tao fanpage ve tinh voi tinh cach khac nhau theo nhan khau hoc ho gia dinh.',
          goal: 'Tao cam giac tu nhien de seeding giong nguoi that.',
          qty: '200 Fanpages',
          timeline: 'Tuan 7-8',
          startWeek: 7,
          endWeek: 8,
        },
        {
          name: 'Xay fanpage San Sale Thu Dau Mot',
          desc: 'Tong hop noi dung tu dong, gan tag khu vuc/nganh hang de dieu huong tam ly mua sam.',
          goal: 'Fanpage hoan chinh co luong tong hop AI moi ngay.',
          qty: '1 Fanpage',
          timeline: 'Tuan 8-10',
          startWeek: 8,
          endWeek: 10,
        },
        {
          name: 'Tao he thong kenh TikTok ve tinh',
          desc: 'Tao 1-3 kenh cong dong dia phuong, noi dung che lai de tranh flop.',
          goal: 'Tao do phu tren TikTok.',
          qty: '3 TikTok',
          timeline: 'Tuan 9-10',
          startWeek: 9,
          endWeek: 10,
        },
        {
          name: 'Tao nhan vat AI lam KOC',
          desc: 'Dung AI tao nhan vat co bo anh/video de van hanh tren TikTok, Facebook, Instagram, Thread.',
          goal: 'Bo tro truyen thong da kenh, tang do phu thuong hieu.',
          qty: '1 TikTok, 1 FB, 1 Instagram, 1 Thread',
          timeline: 'Tuan 9-10',
          startWeek: 9,
          endWeek: 10,
        },
      ],
    },
    {
      name: '2. Van hanh he thong phu',
      tasks: [
        {
          name: 'Tong hop noi dung da nguon va dang group',
          desc: 'AI tong hop tu website, group, fanpage; admin duyet va build clip dang vao group.',
          goal: 'Moi ngay co noi dung hut dan Thu Dau Mot/Binh Duong vao sinh hoat cong dong.',
          qty: 'N/A',
          timeline: 'Lien tuc',
          startWeek: 9,
          endWeek: 12,
        },
        {
          name: 'Seeding fanpage vao group va fanpage muc tieu',
          desc: 'Dung 200 fanpage theo tinh cach/nhan khau hoc de day de xuat tu nhien va tang trust kenh 0 dong.',
          goal: '200 binh luan seeding chia deu cho 3 group + 1 fanpage.',
          qty: '200 cmt/ngay',
          timeline: 'Lien tuc',
          startWeek: 9,
          endWeek: 12,
        },
        {
          name: 'Nuoi tep 20 tai khoan chuan dia phuong',
          desc: 'Moi ngay ket ban theo mang luoi ban be tai Binh Duong, dang bai doi song va phan hoi binh luan.',
          goal: '100 ket noi moi/ngay, khoang 2000 ket noi moi/thang.',
          qty: '20 tai khoan',
          timeline: 'Lien tuc',
          startWeek: 9,
          endWeek: 12,
        },
        {
          name: 'Nhan vat AI hoat dong da nen tang',
          desc: 'Nhan vat AI tu dang bai va phan hoi comment/inbox tren FB, TikTok, Instagram, Thread.',
          goal: 'Duy tri hoat dong lien tuc cua nhan vat AI.',
          qty: '4 kenh',
          timeline: 'Lien tuc',
          startWeek: 9,
          endWeek: 12,
        },
      ],
    },
    {
      name: '3. Khai thac he thong',
      tasks: [
        {
          name: 'Treo banner theo yeu cau chien dich',
          desc: 'Dong bo banner tren toan bo fanpage/group theo yeu cau tung chien dich.',
          goal: 'Hien thi dong nhat tren toan he thong.',
          qty: 'Toan he thong',
          timeline: 'Theo chien dich',
          startWeek: 10,
          endWeek: 12,
        },
        {
          name: 'Seeding cho chien dich san deals',
          desc: 'Len bai theo ke hoach, bao dam luong binh luan; tang cuong seeding cho nhan vat AI bang 20 tai khoan.',
          goal: 'Keo traffic toi da ve chien dich.',
          qty: 'Theo ke hoach chien dich',
          timeline: 'Theo chien dich',
          startWeek: 10,
          endWeek: 12,
        },
        {
          name: 'Cho fanpage ca nhan di comment dao co qua tang',
          desc: 'Trien khai qua tang de fanpage ve tinh comment nhu fan cung PHF nham khuech tan chien dich.',
          goal: 'Dat kha nang ~1000 binh luan/ngay.',
          qty: '1000 cmt/ngay',
          timeline: 'Theo chien dich',
          startWeek: 10,
          endWeek: 12,
        },
      ],
    },
  ],
};

function sanitizeId(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.slice(0, 64);
}

function normalizePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return FALLBACK_DEMO_DATA;
    }
  }
  return payload ?? FALLBACK_DEMO_DATA;
}

async function getPlanByUser(
  request: FastifyRequest,
  businessId: string,
  userId: string,
): Promise<StrategyActionPlanRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyActionPlanRow[]>`
    SELECT strategy_action_plan_id, business_id, user_id, payload, is_demo, updated_at
    FROM strategy_action_plans
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getPlanByBusiness(
  request: FastifyRequest,
  businessId: string,
): Promise<StrategyActionPlanRow | null> {
  const rows = await request.prisma.$queryRaw<StrategyActionPlanRow[]>`
    SELECT strategy_action_plan_id, business_id, user_id, payload, is_demo, updated_at
    FROM strategy_action_plans
    WHERE deleted_at IS NULL
      AND business_id = ${businessId}
      AND user_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handler(
  request: FastifyRequest<{ Querystring: ActionPlanQuery }>,
  reply: FastifyReply,
) {
  const queryBusinessId = sanitizeId(request.query.businessId);
  const queryUserId = sanitizeId(request.query.userId);

  const authUserId = sanitizeId((request.user as { userId?: string } | undefined)?.userId);
  const effectiveUserId = authUserId ?? queryUserId;
  const effectiveBusinessId = queryBusinessId ?? 'demo';

  let source: SourceType = 'demo';
  let selected: StrategyActionPlanRow | null = null;

  if (effectiveUserId) {
    selected = await getPlanByUser(request, effectiveBusinessId, effectiveUserId);
    if (selected) source = 'user';
  }

  if (!selected) {
    selected = await getPlanByBusiness(request, effectiveBusinessId);
    if (selected) source = selected.business_id === 'demo' ? 'demo' : 'business';
  }

  if (!selected && effectiveBusinessId !== 'demo') {
    selected = await getPlanByBusiness(request, 'demo');
    if (selected) source = 'demo';
  }

  const payload = normalizePayload(selected?.payload);

  return reply.send({
    success: true,
    data: payload,
    meta: {
      source,
      businessId: effectiveBusinessId,
      userId: effectiveUserId ?? null,
      usedFallbackDemo: !selected,
      updatedAt: selected?.updated_at?.toISOString() ?? null,
    },
  });
}
