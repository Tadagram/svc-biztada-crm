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

  // ── 1. Clean slate: xóa permissions cũ (cascade xuống rolePermissions, userPermissions) ──
  await prisma.userPermissions.deleteMany({});
  await prisma.rolePermissions.deleteMany({});
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
  const regularUsersData = [
    { phone: '0911000001', parent: agencyIds['0900000001'] },
    { phone: '0911000002', parent: agencyIds['0900000001'] },
    { phone: '0911000003', parent: agencyIds['0900000002'] },
    { phone: '0911000004', parent: agencyIds['0900000002'] },
    { phone: '0911000005', parent: agencyIds['0900000003'] },
    { phone: '0911000006', parent: agencyIds['0900000003'] },
  ];

  const userIds: Record<string, string> = {};
  for (const u of regularUsersData) {
    const user = await prisma.users.upsert({
      where: { phone_number: u.phone },
      update: { status: 'active', deleted_at: null },
      create: {
        phone_number: u.phone,
        role: 'user',
        status: 'active',
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
