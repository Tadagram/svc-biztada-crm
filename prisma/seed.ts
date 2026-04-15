import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Permission codes chuẩn mới ───────────────────────────────────────────────
const PERMISSIONS = [
  { code: 'users:read', name: 'Xem danh sách Users' },
  { code: 'users:create', name: 'Tạo User' },
  { code: 'users:update', name: 'Cập nhật User' },
  { code: 'users:delete', name: 'Xóa User' },
  { code: 'workers:read', name: 'Xem danh sách Workers' },
  { code: 'workers:create', name: 'Tạo Worker' },
  { code: 'workers:update', name: 'Cập nhật Worker' },
  { code: 'workers:delete', name: 'Xóa Worker' },
  { code: 'agency_workers:read', name: 'Xem Agency Workers' },
  { code: 'agency_workers:assign', name: 'Giao Worker cho Agency' },
  { code: 'agency_workers:revoke', name: 'Thu hồi Worker' },
  { code: 'agency_workers:assign_user', name: 'Giao Worker cho User' },
  { code: 'agency_workers:release', name: 'Release Worker' },
  { code: 'permissions:read', name: 'Xem Permissions' },
  { code: 'permissions:create', name: 'Tạo Permission' },
  { code: 'permissions:update', name: 'Cập nhật Permission' },
  { code: 'permissions:delete', name: 'Xóa Permission' },
  { code: 'permissions:manage_overrides', name: 'Quản lý Override User' },
  { code: 'topup:submit', name: 'Gửi yêu cầu nạp tiền' },
  { code: 'topup:review', name: 'Duyệt yêu cầu nạp tiền' },
];

// Role defaults — mod bypasses all checks at runtime (không cần seed)
const ROLE_DEFAULTS: Record<string, string[]> = {
  agency: [
    'users:read',
    'users:create',
    'users:update',
    'workers:read',
    'agency_workers:read',
    'agency_workers:assign_user',
    'agency_workers:release',
    'permissions:read',
    'topup:submit',
  ],
  user: ['users:read', 'workers:read', 'agency_workers:read', 'topup:submit'],
};

async function main() {
  console.log('🌱 Starting database seeding...');

  // ── 1. Clean slate: xóa permissions cũ (cascade xuống rolePermissions & userPermissions) ──
  await prisma.rolePermissions.deleteMany({});
  // Xóa user_permissions nếu bảng còn tồn tại (legacy — migration có thể chưa chạy)
  await prisma.$executeRawUnsafe(`DELETE FROM user_permissions WHERE 1=1`).catch(() => {
    /* bảng đã bị drop rồi */
  });
  await prisma.permissions.deleteMany({});
  console.log('🗑️  Cleared old permissions data');

  // ── 2. Seed Permissions (18 codes mới) ────────────────────────────────────
  const permIdMap: Record<string, string> = {};
  for (const p of PERMISSIONS) {
    const perm = await prisma.permissions.create({ data: p });
    permIdMap[p.code] = perm.permission_id;
  }
  console.log('✅ Permissions seeded:', PERMISSIONS.length);

  // ── 3. Seed RolePermissions defaults ─────────────────────────────────────
  for (const [role, codes] of Object.entries(ROLE_DEFAULTS)) {
    for (const code of codes) {
      await prisma.rolePermissions.create({
        data: { role, permission_id: permIdMap[code] },
      });
    }
  }
  console.log(
    '✅ RolePermissions seeded (agency:',
    ROLE_DEFAULTS.agency.length,
    '/ user:',
    ROLE_DEFAULTS.user.length,
    ')',
  );

  // ── 4. Mod User ──────────────────────────────────────────────────────────
  const modUser = await prisma.users.upsert({
    where: { phone_number: '0347503886' },
    update: { status: 'active', deleted_at: null },
    create: {
      phone_number: '0347503886',
      role: 'mod',
      status: 'active',
      agency_name: 'System Admin',
    },
  });
  console.log('✅ Mod user:', modUser.phone_number);

  // ── 5. Agency Users ───────────────────────────────────────────────────────
  const agenciesData = [
    { phone: '0900000001', name: 'Biztada Agency' },
    { phone: '0900000002', name: 'TechWork Solutions' },
    { phone: '0900000003', name: 'Smart Labor Co' },
  ];

  const agencyIds: Record<string, string> = {};
  for (const a of agenciesData) {
    const agency = await prisma.users.upsert({
      where: { phone_number: a.phone },
      update: { status: 'active', deleted_at: null },
      create: {
        phone_number: a.phone,
        role: 'agency',
        status: 'active',
        agency_name: a.name,
        parent_user_id: modUser.user_id,
      },
    });
    agencyIds[a.phone] = agency.user_id;
  }
  console.log('✅ Agency users seeded:', agenciesData.length);

  // ── 6. Regular Users (2 per agency) ──────────────────────────────────────
  const now = new Date();
  const daysBack = (d: number) => new Date(now.getTime() - d * 86_400_000);

  const regularUsersData = [
    {
      phone: '0911000001',
      name: 'Nguyễn Văn An',
      parent: agencyIds['0900000001'],
      lastActive: daysBack(2),
    },
    {
      phone: '0911000002',
      name: 'Trần Thị Bích',
      parent: agencyIds['0900000001'],
      lastActive: daysBack(20),
    },
    {
      phone: '0911000003',
      name: 'Lê Minh Cường',
      parent: agencyIds['0900000002'],
      lastActive: daysBack(5),
    },
    {
      phone: '0911000004',
      name: 'Phạm Thị Dung',
      parent: agencyIds['0900000002'],
      lastActive: daysBack(60),
    },
    {
      phone: '0911000005',
      name: 'Hoàng Quốc Hùng',
      parent: agencyIds['0900000003'],
      lastActive: daysBack(10),
    },
    { phone: '0911000006', name: 'Võ Thị Mai', parent: agencyIds['0900000003'], lastActive: null },
  ];

  const userIds: Record<string, string> = {};
  for (const u of regularUsersData) {
    const user = await prisma.users.upsert({
      where: { phone_number: u.phone },
      update: {
        status: 'active',
        deleted_at: null,
        agency_name: u.name,
        last_active_at: u.lastActive,
      },
      create: {
        phone_number: u.phone,
        role: 'user',
        status: 'active',
        agency_name: u.name,
        last_active_at: u.lastActive,
        parent_user_id: u.parent,
      },
    });
    userIds[u.phone] = user.user_id;
  }
  console.log('✅ Regular users seeded:', regularUsersData.length);

  // ── 7. Workers ────────────────────────────────────────────────────────────
  const existingWorkers = await prisma.workers.findMany({ where: { deleted_at: null } });
  let workerIds: string[] = existingWorkers.map((w) => w.worker_id);

  if (existingWorkers.length < 9) {
    const workersData = [
      { name: 'Worker Alpha', status: 'ready' },
      { name: 'Worker Beta', status: 'ready' },
      { name: 'Worker Gamma', status: 'ready' },
      { name: 'Worker Delta', status: 'busy' },
      { name: 'Worker Epsilon', status: 'ready' },
      { name: 'Worker Zeta', status: 'ready' },
      { name: 'Worker Eta', status: 'offline' },
      { name: 'Worker Theta', status: 'ready' },
      { name: 'Worker Iota', status: 'ready' },
    ];
    const created = await Promise.all(workersData.map((w) => prisma.workers.create({ data: w })));
    workerIds = created.map((w) => w.worker_id);
    console.log('✅ Workers created:', workerIds.length);
  } else {
    console.log('✅ Workers already exist, skipping:', workerIds.length);
  }

  // ── 8. Agency ↔ Worker Assignments (3 workers per agency) ─────────────────
  const agencyPhones = Object.keys(agencyIds);
  for (let i = 0; i < agencyPhones.length; i++) {
    const agencyId = agencyIds[agencyPhones[i]];
    const chunk = workerIds.slice(i * 3, i * 3 + 3);
    for (const wId of chunk) {
      const existing = await prisma.agencyWorkers.findFirst({
        where: { agency_user_id: agencyId, worker_id: wId, deleted_at: null },
      });
      if (!existing) {
        await prisma.agencyWorkers.create({
          data: { agency_user_id: agencyId, worker_id: wId, status: 'active' },
        });
      }
    }
  }
  console.log('✅ Workers assigned to agencies (3 each)');

  // ── 9. Simulate active worker usage ──────────────────────────────────────
  const firstAgencyId = agencyIds['0900000001'];
  const firstAssignment = await prisma.agencyWorkers.findFirst({
    where: { agency_user_id: firstAgencyId, using_by: null, deleted_at: null },
  });
  const firstUserId = userIds['0911000001'];

  if (firstAssignment && firstUserId) {
    await prisma.agencyWorkers.update({
      where: { agency_worker_id: firstAssignment.agency_worker_id },
      data: { using_by: firstUserId },
    });
    const existingLog = await prisma.workerUsageLogs.findFirst({
      where: { worker_id: firstAssignment.worker_id, user_id: firstUserId, end_at: null },
    });
    if (!existingLog) {
      await prisma.workerUsageLogs.create({
        data: {
          worker_id: firstAssignment.worker_id,
          agency_user_id: firstAgencyId,
          user_id: firstUserId,
          start_at: new Date(),
        },
      });
    }
    console.log('✅ Sample usage log created');
  }

  // ── 10. WorkerUsageLogs — rich historical data ───────────────────────────
  await prisma.workerUsageLogs.deleteMany({});

  // helper: date relative to now (negative = past)
  const daysAgo = (d: number, hOffset = 0) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    dt.setHours(dt.getHours() + hOffset, 0, 0, 0);
    return dt;
  };
  const hoursLater = (base: Date, h: number) => new Date(base.getTime() + h * 3600_000);

  // Scenario matrix: [workerIndex, agencyPhone, userPhone, daysBack, durationHours | null=active]
  const logScenarios: [number, string, string, number, number | null][] = [
    // Worker Alpha (idx 0) — Biztada Agency
    [0, '0900000001', '0911000001', 28, 2],
    [0, '0900000001', '0911000002', 25, 1.5],
    [0, '0900000001', '0911000001', 21, 3],
    [0, '0900000001', '0911000002', 18, 0.75],
    [0, '0900000001', '0911000001', 14, 2.5],
    [0, '0900000001', '0911000002', 10, 1],
    [0, '0900000001', '0911000001', 5, 4],
    [0, '0900000001', '0911000002', 1, null], // active
    // Worker Beta (idx 1) — Biztada Agency
    [1, '0900000001', '0911000001', 27, 1],
    [1, '0900000001', '0911000002', 22, 2],
    [1, '0900000001', '0911000001', 17, 1.5],
    [1, '0900000001', '0911000002', 12, 3],
    [1, '0900000001', '0911000001', 7, 0.5],
    [1, '0900000001', '0911000002', 3, 2],
    // Worker Gamma (idx 2) — Biztada Agency
    [2, '0900000001', '0911000001', 30, 1],
    [2, '0900000001', '0911000002', 24, 2.5],
    [2, '0900000001', '0911000001', 16, 1],
    [2, '0900000001', '0911000002', 9, 3],
    [2, '0900000001', '0911000001', 2, null], // active
    // Worker Delta (idx 3) — TechWork Solutions
    [3, '0900000002', '0911000003', 29, 2],
    [3, '0900000002', '0911000004', 23, 1],
    [3, '0900000002', '0911000003', 19, 3.5],
    [3, '0900000002', '0911000004', 13, 1.5],
    [3, '0900000002', '0911000003', 8, 2],
    [3, '0900000002', '0911000004', 4, null], // active
    // Worker Epsilon (idx 4) — TechWork Solutions
    [4, '0900000002', '0911000003', 26, 0.5],
    [4, '0900000002', '0911000004', 20, 2],
    [4, '0900000002', '0911000003', 15, 1.5],
    [4, '0900000002', '0911000004', 11, 3],
    [4, '0900000002', '0911000003', 6, 1],
    [4, '0900000002', '0911000004', 2, 2.5],
    // Worker Zeta (idx 5) — TechWork Solutions
    [5, '0900000002', '0911000003', 28, 1.5],
    [5, '0900000002', '0911000004', 21, 2],
    [5, '0900000002', '0911000003', 14, 3],
    [5, '0900000002', '0911000004', 7, 0.75],
    [5, '0900000002', '0911000003', 3, 1],
    // Worker Eta (idx 6) — Smart Labor Co (offline worker — old logs only)
    [6, '0900000003', '0911000005', 60, 2],
    [6, '0900000003', '0911000006', 55, 1],
    [6, '0900000003', '0911000005', 45, 3],
    // Worker Theta (idx 7) — Smart Labor Co
    [7, '0900000003', '0911000005', 27, 2],
    [7, '0900000003', '0911000006', 20, 1.5],
    [7, '0900000003', '0911000005', 15, 3],
    [7, '0900000003', '0911000006', 9, 1],
    [7, '0900000003', '0911000005', 4, 2],
    [7, '0900000003', '0911000006', 1, null], // active
    // Worker Iota (idx 8) — Smart Labor Co
    [8, '0900000003', '0911000005', 25, 1],
    [8, '0900000003', '0911000006', 18, 2.5],
    [8, '0900000003', '0911000005', 12, 1.5],
    [8, '0900000003', '0911000006', 6, 3],
    [8, '0900000003', '0911000005', 2, 2],
  ];

  let logCount = 0;
  for (const [wIdx, agencyPhone, userPhone, days, durationH] of logScenarios) {
    if (wIdx >= workerIds.length) continue;
    const wId = workerIds[wIdx];
    const aId = agencyIds[agencyPhone];
    const uId = userIds[userPhone];
    if (!wId || !aId || !uId) continue;
    const startAt = daysAgo(days, -8 + (logCount % 10)); // vary hour offset
    const endAt = durationH !== null ? hoursLater(startAt, durationH) : null;
    await prisma.workerUsageLogs.create({
      data: {
        worker_id: wId,
        agency_user_id: aId,
        user_id: uId,
        start_at: startAt,
        end_at: endAt,
      },
    });
    logCount++;
  }
  console.log(`✅ WorkerUsageLogs seeded: ${logCount} entries`);

  // ── 11. Notifications — 25 entries spread over 30 days for infinite scroll ──
  await prisma.notifications.deleteMany({});

  const agency1Id = agencyIds['0900000001'];
  const agency2Id = agencyIds['0900000002'];
  const user1Id = userIds['0911000001'];
  const user2Id = userIds['0911000002'];

  // Target recipient for main infinite-scroll testing = modUser (has all 25 noti)
  const notiSeed = [
    // Day 0 (today)
    {
      recipient_id: modUser.user_id,
      sender_id: user1Id,
      type: 'user_action' as const,
      title: 'Người dùng yêu cầu hỗ trợ',
      body: 'Nguyễn Văn An đã gửi yêu cầu hỗ trợ kỹ thuật khẩn cấp.',
      action_url: '/users',
      image_url: null,
      custom_fields: {
        request_type: 'technical_support',
        priority: 'high',
        user_phone: '0911000001',
      },
      is_read: false,
      created_at: daysAgo(0),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: agency1Id,
      type: 'system_alert' as const,
      title: 'Cảnh báo: Tải hệ thống cao',
      body: 'CPU đạt 90% trong 10 phút qua. Kiểm tra ngay.',
      action_url: null,
      image_url: null,
      custom_fields: { severity: 'high' },
      is_read: false,
      created_at: daysAgo(0),
    },
    // Day 1
    {
      recipient_id: modUser.user_id,
      sender_id: user2Id,
      type: 'user_action' as const,
      title: 'Yêu cầu nâng cấp gói',
      body: 'Trần Thị Bích yêu cầu nâng cấp tài khoản lên Premium.',
      action_url: '/users',
      image_url: null,
      custom_fields: { request_type: 'plan_upgrade', priority: 'normal', user_phone: '0911000002' },
      is_read: false,
      created_at: daysAgo(1),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: null,
      type: 'system_alert' as const,
      title: 'Bảo trì định kỳ đêm nay',
      body: 'Hệ thống sẽ bảo trì 02:00–02:30 ngày 15/04/2026.',
      action_url: null,
      image_url: null,
      custom_fields: {
        scheduled_at: '2026-04-15T02:00:00Z',
        duration_minutes: 30,
        severity: 'medium',
      },
      is_read: true,
      read_at: daysAgo(1),
      created_at: daysAgo(1),
    },
    // Day 2
    {
      recipient_id: modUser.user_id,
      sender_id: agency2Id,
      type: 'worker_assigned' as const,
      title: 'Worker mới được gán',
      body: 'Worker Gamma đã được gán cho Lê Minh Cường bởi TechWork Solutions.',
      action_url: '/workers',
      image_url: null,
      custom_fields: {
        worker_id: workerIds[2],
        worker_name: 'Worker Gamma',
        agency_name: 'TechWork Solutions',
        assigned_by: 'TechWork Solutions',
      },
      is_read: false,
      created_at: daysAgo(2),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: agency1Id,
      type: 'account_updated' as const,
      title: 'Agency cập nhật thông tin',
      body: 'Biztada Agency đã cập nhật tên agency và số điện thoại.',
      action_url: '/users',
      image_url: null,
      custom_fields: { updated_fields: ['agency_name', 'phone_number'] },
      is_read: true,
      read_at: daysAgo(2),
      created_at: daysAgo(2),
    },
    // Day 3
    {
      recipient_id: modUser.user_id,
      sender_id: user1Id,
      type: 'user_action' as const,
      title: 'Báo cáo sự cố',
      body: 'Nguyễn Văn An báo cáo: Worker Alpha bị lỗi kết nối trong 2 giờ.',
      action_url: '/workers',
      image_url: null,
      custom_fields: {
        request_type: 'incident_report',
        priority: 'high',
        user_phone: '0911000001',
      },
      is_read: true,
      read_at: daysAgo(3),
      created_at: daysAgo(3),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: null,
      type: 'custom' as const,
      title: '🎉 Hệ thống đạt 1000 người dùng',
      body: 'Chúc mừng! Nền tảng đã đạt mốc 1000 người dùng hoạt động.',
      action_url: '/dashboard',
      image_url: 'https://placehold.co/600x200/7c3aed/white?text=1000+Users',
      custom_fields: { badge_color: '#7c3aed', cta_label: 'Xem thống kê', plan: 'milestone' },
      is_read: true,
      read_at: daysAgo(3),
      created_at: daysAgo(3),
    },
    // Day 5
    {
      recipient_id: modUser.user_id,
      sender_id: agency1Id,
      type: 'permission_changed' as const,
      title: 'Yêu cầu mở quyền đặc biệt',
      body: 'Biztada Agency yêu cầu quyền workers:delete cho tài khoản.',
      action_url: '/permissions',
      image_url: null,
      custom_fields: { changed_permissions: ['workers:delete'], action: 'granted' },
      is_read: false,
      created_at: daysAgo(5),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: user2Id,
      type: 'user_action' as const,
      title: 'Yêu cầu đổi Worker',
      body: 'Trần Thị Bích yêu cầu thay thế Worker Beta do hiệu suất kém.',
      action_url: '/workers',
      image_url: null,
      custom_fields: {
        request_type: 'worker_replacement',
        priority: 'normal',
        user_phone: '0911000002',
      },
      is_read: true,
      read_at: daysAgo(5),
      created_at: daysAgo(5),
    },
    // Day 7
    {
      recipient_id: modUser.user_id,
      sender_id: null,
      type: 'system_alert' as const,
      title: 'Phát hiện đăng nhập bất thường',
      body: 'Có đăng nhập từ IP 103.12.45.67 lúc 03:14 AM. Kiểm tra ngay.',
      action_url: '/settings',
      image_url: null,
      custom_fields: { severity: 'critical' },
      is_read: true,
      read_at: daysAgo(7),
      created_at: daysAgo(7),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: agency2Id,
      type: 'worker_released' as const,
      title: 'Worker bị thu hồi',
      body: 'Worker Delta đã bị thu hồi khỏi Phạm Thị Dung bởi TechWork Solutions.',
      action_url: '/workers',
      image_url: null,
      custom_fields: {
        worker_id: workerIds[3],
        worker_name: 'Worker Delta',
        reason: 'Contract ended',
      },
      is_read: true,
      read_at: daysAgo(7),
      created_at: daysAgo(7),
    },
    // Day 10
    {
      recipient_id: modUser.user_id,
      sender_id: user1Id,
      type: 'user_action' as const,
      title: 'Yêu cầu thanh toán thủ công',
      body: 'Nguyễn Văn An yêu cầu xử lý thanh toán thủ công tháng 3.',
      action_url: '/users',
      image_url: null,
      custom_fields: {
        request_type: 'manual_payment',
        priority: 'normal',
        user_phone: '0911000001',
      },
      is_read: true,
      read_at: daysAgo(10),
      created_at: daysAgo(10),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: agency1Id,
      type: 'account_updated' as const,
      title: 'Agency thêm Worker mới',
      body: 'Biztada Agency đã thêm 3 worker mới vào hệ thống.',
      action_url: '/workers',
      image_url: null,
      custom_fields: { updated_fields: ['worker_count'] },
      is_read: true,
      read_at: daysAgo(10),
      created_at: daysAgo(10),
    },
    // Day 12
    {
      recipient_id: modUser.user_id,
      sender_id: null,
      type: 'system_alert' as const,
      title: 'Backup dữ liệu hoàn tất',
      body: 'Backup tự động lúc 00:00 đã hoàn tất thành công. Dung lượng: 2.4 GB.',
      action_url: null,
      image_url: null,
      custom_fields: { severity: 'low' },
      is_read: true,
      read_at: daysAgo(12),
      created_at: daysAgo(12),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: agency2Id,
      type: 'permission_changed' as const,
      title: 'Quyền agency được cập nhật',
      body: 'TechWork Solutions đã được cấp thêm quyền agency_workers:assign.',
      action_url: '/permissions',
      image_url: null,
      custom_fields: { changed_permissions: ['agency_workers:assign'], action: 'granted' },
      is_read: true,
      read_at: daysAgo(12),
      created_at: daysAgo(12),
    },
    // Day 15
    {
      recipient_id: modUser.user_id,
      sender_id: user2Id,
      type: 'user_action' as const,
      title: 'Phản hồi đánh giá dịch vụ',
      body: 'Trần Thị Bích đã gửi đánh giá 5 sao cho dịch vụ tháng 3.',
      action_url: '/users',
      image_url: null,
      custom_fields: { request_type: 'feedback', priority: 'low', user_phone: '0911000002' },
      is_read: true,
      read_at: daysAgo(15),
      created_at: daysAgo(15),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: agency1Id,
      type: 'worker_assigned' as const,
      title: 'Gán Worker cho người dùng mới',
      body: 'Worker Epsilon đã được gán cho Lê Văn Đức bởi Biztada Agency.',
      action_url: '/workers',
      image_url: null,
      custom_fields: {
        worker_id: workerIds[4] ?? workerIds[0],
        worker_name: 'Worker Epsilon',
        agency_name: 'Biztada Agency',
        assigned_by: 'Biztada Agency',
      },
      is_read: true,
      read_at: daysAgo(15),
      created_at: daysAgo(15),
    },
    // Day 18
    {
      recipient_id: modUser.user_id,
      sender_id: null,
      type: 'custom' as const,
      title: 'Tính năng mới: Báo cáo nâng cao',
      body: 'Đã ra mắt tính năng báo cáo nâng cao với biểu đồ thời gian thực.',
      action_url: '/dashboard',
      image_url: 'https://placehold.co/600x200/0ea5e9/white?text=New+Feature',
      custom_fields: { badge_color: '#0ea5e9', cta_label: 'Khám phá ngay', plan: 'all' },
      is_read: true,
      read_at: daysAgo(18),
      created_at: daysAgo(18),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: agency2Id,
      type: 'worker_released' as const,
      title: 'Thu hồi Worker Zeta',
      body: 'Worker Zeta đã bị thu hồi sau khi hết hợp đồng với Smart Labor Co.',
      action_url: '/workers',
      image_url: null,
      custom_fields: {
        worker_id: workerIds[1],
        worker_name: 'Worker Zeta',
        reason: 'Contract expired',
      },
      is_read: true,
      read_at: daysAgo(18),
      created_at: daysAgo(18),
    },
    // Day 22
    {
      recipient_id: modUser.user_id,
      sender_id: user1Id,
      type: 'user_action' as const,
      title: 'Yêu cầu khôi phục tài khoản',
      body: 'Nguyễn Văn An yêu cầu khôi phục sau khi tài khoản bị tạm khóa.',
      action_url: '/users',
      image_url: null,
      custom_fields: {
        request_type: 'account_recovery',
        priority: 'high',
        user_phone: '0911000001',
      },
      is_read: true,
      read_at: daysAgo(22),
      created_at: daysAgo(22),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: null,
      type: 'system_alert' as const,
      title: 'Cập nhật hệ thống v2.4',
      body: 'Hệ thống đã được cập nhật lên phiên bản 2.4 với nhiều cải tiến hiệu suất.',
      action_url: null,
      image_url: null,
      custom_fields: { severity: 'low' },
      is_read: true,
      read_at: daysAgo(22),
      created_at: daysAgo(22),
    },
    // Day 26
    {
      recipient_id: modUser.user_id,
      sender_id: agency1Id,
      type: 'account_updated' as const,
      title: 'Gia hạn hợp đồng agency',
      body: 'Biztada Agency đã ký hợp đồng gia hạn thêm 12 tháng.',
      action_url: '/users',
      image_url: null,
      custom_fields: { updated_fields: ['contract_expiry', 'plan'] },
      is_read: true,
      read_at: daysAgo(26),
      created_at: daysAgo(26),
    },
    {
      recipient_id: modUser.user_id,
      sender_id: null,
      type: 'custom' as const,
      title: '📊 Báo cáo tháng 3/2026',
      body: 'Báo cáo hiệu suất tháng 3 đã sẵn sàng. Tổng doanh thu tăng 18% so với tháng trước.',
      action_url: '/dashboard',
      image_url: 'https://placehold.co/600x200/10b981/white?text=March+Report',
      custom_fields: { badge_color: '#10b981', cta_label: 'Xem báo cáo', plan: 'all' },
      is_read: true,
      read_at: daysAgo(26),
      created_at: daysAgo(26),
    },
    // Day 30
    {
      recipient_id: modUser.user_id,
      sender_id: agency2Id,
      type: 'permission_changed' as const,
      title: 'Thu hồi quyền agency',
      body: 'TechWork Solutions bị thu hồi quyền workers:delete do vi phạm chính sách.',
      action_url: '/permissions',
      image_url: null,
      custom_fields: { changed_permissions: ['workers:delete'], action: 'revoked' },
      is_read: true,
      read_at: daysAgo(30),
      created_at: daysAgo(30),
    },
    // Notifications for agency1 and users (existing functional tests)
    {
      recipient_id: user1Id,
      sender_id: agency1Id,
      type: 'worker_assigned' as const,
      title: 'Worker Alpha đã được gán cho bạn',
      body: 'Bắt đầu sử dụng Worker Alpha ngay hôm nay.',
      action_url: '/workers',
      image_url: null,
      custom_fields: {
        worker_id: workerIds[0],
        worker_name: 'Worker Alpha',
        agency_name: 'Biztada Agency',
        assigned_by: 'Biztada Agency',
      },
      is_read: true,
      read_at: daysAgo(3),
      created_at: daysAgo(3),
    },
    {
      recipient_id: user1Id,
      sender_id: modUser.user_id,
      type: 'permission_changed' as const,
      title: 'Quyền hạn của bạn đã thay đổi',
      body: 'Moderator đã cập nhật quyền hạn tài khoản của bạn.',
      action_url: '/settings?tab=permissions',
      image_url: null,
      custom_fields: {
        changed_permissions: ['workers:create', 'workers:delete'],
        action: 'granted',
      },
      is_read: false,
      created_at: daysAgo(0),
    },
    {
      recipient_id: agency1Id,
      sender_id: modUser.user_id,
      type: 'account_updated' as const,
      title: 'Tài khoản được cập nhật',
      body: 'Thông tin tài khoản của bạn đã được cập nhật bởi Moderator.',
      action_url: '/settings',
      image_url: null,
      custom_fields: { updated_fields: ['status', 'agency_name'] },
      is_read: true,
      read_at: daysAgo(5),
      created_at: daysAgo(7),
    },
    {
      recipient_id: agency1Id,
      sender_id: modUser.user_id,
      type: 'custom' as const,
      title: '🎉 Chào mừng lên gói Premium',
      body: 'Tài khoản của bạn đã được nâng cấp lên gói Premium. Tận hưởng tất cả tính năng!',
      image_url: 'https://placehold.co/600x200/7c3aed/white?text=Premium+Activated',
      action_url: '/settings',
      custom_fields: {
        badge_color: '#7c3aed',
        cta_label: 'Khám phá ngay',
        plan: 'premium',
        valid_until: '2027-04-14',
      },
      is_read: false,
      created_at: daysAgo(0),
    },
  ];

  for (const n of notiSeed) {
    await prisma.notifications.create({ data: n });
  }
  console.log(`✅ Notifications seeded: ${notiSeed.length} entries (25 for mod, spread 0–30 days)`);

  // ── TopUp Requests (test data) ────────────────────────────────────────────
  await prisma.topUpRequests.deleteMany({});

  const modId = modUser.user_id;

  if (user1Id && user2Id) {
    await prisma.topUpRequests.createMany({
      data: [
        // PENDING — chờ duyệt
        {
          user_id: user1Id,
          amount: 500000,
          proof_note: 'CK từ VCB 9999 - 14/04/2026 10:30 - Nap tien user1',
          status: 'PENDING',
          submitted_at: daysAgo(0),
        },
        {
          user_id: user2Id,
          amount: 200000,
          proof_note: 'Techcombank 8888 - 13/04/2026 15:00 - nap tai khoan',
          status: 'PENDING',
          submitted_at: daysAgo(1),
        },
        // APPROVED — đã duyệt (balance đã cộng)
        {
          user_id: user1Id,
          amount: 1000000,
          proof_note: 'ACB 7777 - 10/04/2026 09:00 - nap 1 trieu',
          status: 'APPROVED',
          submitted_at: daysAgo(4),
          reviewed_by: modId,
          reviewed_at: daysAgo(3),
          review_note: 'Đã xác nhận bank',
        },
        // REJECTED — bị từ chối
        {
          user_id: user2Id,
          amount: 999999,
          proof_note: 'So tien sai - 08/04/2026',
          status: 'REJECTED',
          submitted_at: daysAgo(6),
          reviewed_by: modId,
          reviewed_at: daysAgo(6),
          review_note: 'Không tìm thấy giao dịch tương ứng, vui lòng kiểm tra lại',
        },
      ],
    });
    // Cộng balance cho approved requests
    await prisma.users.update({
      where: { user_id: user1Id },
      data: { balance: { increment: 1000000 } },
    });
    console.log('✅ TopUpRequests seeded: 4 entries (2 PENDING, 1 APPROVED, 1 REJECTED)');
  }
  console.log('\n🏁 Seeding completed!');
  console.log(`   • Permissions   : ${PERMISSIONS.length} (codes mới chuẩn resource:action)`);
  console.log(
    `   • RolePerms     : agency=${ROLE_DEFAULTS.agency.length}, user=${ROLE_DEFAULTS.user.length}`,
  );
  console.log(`   • Mod           : 1  → 0347503886`);
  console.log(`   • Agencies      : ${agenciesData.length}  → 0900000001~3`);
  console.log(`   • Users         : ${regularUsersData.length}  → 0911000001~6`);
  console.log(`   • Workers       : ${workerIds.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
