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
  ],
  user: ['users:read', 'workers:read', 'agency_workers:read'],
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

  // ── 11. Notifications — sample for every type ──────────────────────────
  await prisma.notifications.deleteMany({});

  const agency1Id = agencyIds['0900000001'];
  const user1Id = userIds['0911000001'];
  const user2Id = userIds['0911000002'];

  const notiSeed = [
    // system_alert → mod broadcasts to agency
    {
      recipient_id: agency1Id,
      sender_id: modUser.user_id,
      type: 'system_alert' as const,
      title: 'Hệ thống bảo trì',
      body: 'Hệ thống sẽ bảo trì vào 02:00 ngày 15/04/2026. Vui lòng lưu công việc trước.',
      image_url: null,
      action_url: null,
      custom_fields: { scheduled_at: '2026-04-15T02:00:00Z', duration_minutes: 30 },
      is_read: false,
      created_at: daysAgo(1),
    },
    // worker_assigned → notify user when a worker is assigned to them
    {
      recipient_id: user1Id,
      sender_id: agency1Id,
      type: 'worker_assigned' as const,
      title: 'Worker được gán cho bạn',
      body: 'Worker Alpha đã được gán cho bạn. Bắt đầu sử dụng ngay.',
      image_url: null,
      action_url: '/workers',
      custom_fields: {
        worker_id: workerIds[0],
        worker_name: 'Worker Alpha',
        agency_name: 'Biztada Agency',
        assigned_by: 'Biztada Agency',
      },
      is_read: true,
      read_at: daysAgo(2),
      created_at: daysAgo(3),
    },
    // worker_released
    {
      recipient_id: user2Id,
      sender_id: agency1Id,
      type: 'worker_released' as const,
      title: 'Worker đã bị thu hồi',
      body: 'Worker Beta đã được thu hồi bởi Biztada Agency.',
      image_url: null,
      action_url: '/workers',
      custom_fields: {
        worker_id: workerIds[1],
        worker_name: 'Worker Beta',
        reason: 'Assignment ended',
      },
      is_read: false,
      created_at: daysAgo(0),
    },
    // permission_changed
    {
      recipient_id: user1Id,
      sender_id: modUser.user_id,
      type: 'permission_changed' as const,
      title: 'Quyền hạn của bạn đã thay đổi',
      body: 'Moderator đã cập nhật quyền hạn tài khoản của bạn.',
      image_url: null,
      action_url: '/settings?tab=permissions',
      custom_fields: {
        changed_permissions: ['workers:create', 'workers:delete'],
        action: 'granted',
      },
      is_read: false,
      created_at: daysAgo(0),
    },
    // account_updated
    {
      recipient_id: agency1Id,
      sender_id: modUser.user_id,
      type: 'account_updated' as const,
      title: 'Tài khoản được cập nhật',
      body: 'Thông tin tài khoản của bạn đã được cập nhật bởi Moderator.',
      image_url: null,
      action_url: '/settings',
      custom_fields: { updated_fields: ['status', 'agency_name'] },
      is_read: true,
      read_at: daysAgo(5),
      created_at: daysAgo(7),
    },
    // user_action
    {
      recipient_id: modUser.user_id,
      sender_id: user1Id,
      type: 'user_action' as const,
      title: 'Người dùng yêu cầu hỗ trợ',
      body: 'Nguyễn Văn An đã gửi yêu cầu hỗ trợ kỹ thuật.',
      image_url: null,
      action_url: '/users',
      custom_fields: {
        request_type: 'technical_support',
        priority: 'high',
        user_phone: '0911000001',
      },
      is_read: false,
      created_at: daysAgo(0),
    },
    // custom — with image
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
  console.log(`✅ Notifications seeded: ${notiSeed.length} entries`);

  // ── Summary ───────────────────────────────────────────────────────────────
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
