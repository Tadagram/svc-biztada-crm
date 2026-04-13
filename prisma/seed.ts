import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helper: Idempotent permission assignment ─────────────────────────────────
async function assignPermission(userId: string, permissionId: string) {
  const existing = await prisma.userPermissions.findFirst({
    where: { user_id: userId, permission_id: permissionId },
  });
  if (!existing) {
    await prisma.userPermissions.create({
      data: { user_id: userId, permission_id: permissionId, permission_type: 'allow' },
    });
  }
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // ── 1. Permissions ────────────────────────────────────────────────────────
  const permissionsData = [
    { name: 'Dashboard View', code: 'dashboard.view' },
    { name: 'User Manage', code: 'users.manage' },
    { name: 'Worker Assign', code: 'workers.assign' },
    { name: 'Settings Manage', code: 'settings.manage' },
    { name: 'Worker List', code: 'workers.list' },
    { name: 'Worker Delete', code: 'workers.delete' },
    { name: 'Agency View', code: 'agency.view' },
    { name: 'Agency Manage', code: 'agency.manage' },
    { name: 'Report View', code: 'report.view' },
    { name: 'System Settings', code: 'system.settings' },
  ];

  const permissions: Record<string, string> = {};
  for (const p of permissionsData) {
    const perm = await prisma.permissions.upsert({
      where: { code: p.code },
      update: { name: p.name, deleted_at: null },
      create: p,
    });
    permissions[p.code] = perm.permission_id;
  }
  console.log('✅ Permissions seeded:', Object.keys(permissions).length);

  // ── 2. Mod User ───────────────────────────────────────────────────────────
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
  console.log('✅ Mod user:', modUser.phone_number, `(${modUser.role})`);

  const MOD_PERMISSIONS = Object.keys(permissions); // mod gets all
  for (const code of MOD_PERMISSIONS) {
    await assignPermission(modUser.user_id, permissions[code]);
  }
  console.log('✅ Mod permissions assigned:', MOD_PERMISSIONS.length);

  // ── 3. Agency Users ───────────────────────────────────────────────────────
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

    const AGENCY_PERMISSIONS = [
      'workers.list',
      'workers.assign',
      'report.view',
      'agency.view',
      'dashboard.view',
    ];
    for (const code of AGENCY_PERMISSIONS) {
      await assignPermission(agency.user_id, permissions[code]);
    }
  }
  console.log('✅ Agency users seeded:', agenciesData.length);

  // ── 4. Regular Users (2 per agency) ──────────────────────────────────────
  const regularUsersData = [
    // Biztada Agency
    { phone: '0911000001', parent: agencyIds['0900000001'] },
    { phone: '0911000002', parent: agencyIds['0900000001'] },
    // TechWork Solutions
    { phone: '0911000003', parent: agencyIds['0900000002'] },
    { phone: '0911000004', parent: agencyIds['0900000002'] },
    // Smart Labor Co
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

    for (const code of ['workers.list', 'dashboard.view']) {
      await assignPermission(user.user_id, permissions[code]);
    }
  }
  console.log('✅ Regular users seeded:', regularUsersData.length);

  // ── 5. Workers ────────────────────────────────────────────────────────────
  // Check if workers already exist to keep seed idempotent
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
    console.log('✅ Workers already exist, skipping creation:', workerIds.length);
  }

  // ── 6. Agency ↔ Worker Assignments (3 workers per agency) ─────────────────
  const agencyPhones = Object.keys(agencyIds);
  const chunkSize = 3;

  for (let i = 0; i < agencyPhones.length; i++) {
    const agencyId = agencyIds[agencyPhones[i]];
    const chunk = workerIds.slice(i * chunkSize, i * chunkSize + chunkSize);

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

  // ── 7. Simulate active worker usage ───────────────────────────────────────
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
      where: {
        worker_id: firstAssignment.worker_id,
        agency_user_id: firstAgencyId,
        user_id: firstUserId,
        end_at: null,
      },
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
    console.log('✅ Sample usage log created (worker currently in use)');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n🏁 Seeding completed!');
  console.log(`   • Permissions  : ${Object.keys(permissions).length}`);
  console.log(`   • Mod users    : 1  → phone: 0347503886`);
  console.log(`   • Agencies     : ${agenciesData.length}  → 0900000001, 0900000002, 0900000003`);
  console.log(`   • Users        : ${regularUsersData.length}  → 0911000001–0911000006`);
  console.log(`   • Workers      : ${workerIds.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
