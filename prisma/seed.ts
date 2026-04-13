import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Permissions
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

  const permissions: { [key: string]: string } = {};
  for (const p of permissionsData) {
    const perm = await prisma.permissions.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    permissions[p.code] = perm.permission_id;
  }
  console.log('✅ Permissions seeded:', Object.keys(permissions).length);

  // 2. Seed Super Admin (Mod) - with custom phone
  const modUser = await prisma.users.upsert({
    where: { phone_number: '0347503886' },
    update: { status: 'active' },
    create: {
      phone_number: '0347503886',
      role: 'mod',
      status: 'active',
      agency_name: 'System Admin',
    },
  });
  console.log('✅ Mod user seeded:', modUser.phone_number, modUser.role);

  // Assign all permissions to mod user
  const modPermissions = [
    'dashboard.view',
    'users.manage',
    'workers.assign',
    'settings.manage',
    'workers.list',
    'workers.delete',
    'agency.view',
    'agency.manage',
    'report.view',
    'system.settings',
  ];

  for (const permCode of modPermissions) {
    await prisma.userPermissions.create({
      data: {
        user_id: modUser.user_id,
        permission_id: permissions[permCode],
        permission_type: 'allow',
      },
    });
  }
  console.log('✅ Mod permissions assigned:', modPermissions.length);

  // 3. Seed Multiple Agencies
  const agenciesData = [
    { phone: '0347503887', name: 'Biztada Agency', parent: modUser.user_id },
    { phone: '0347503888', name: 'TechWork Solutions', parent: modUser.user_id },
    { phone: '0347503889', name: 'Smart Labor Co', parent: modUser.user_id },
  ];

  const agencyUsers: { [key: string]: string } = {};
  for (const a of agenciesData) {
    const agency = await prisma.users.upsert({
      where: { phone_number: a.phone },
      update: { status: 'active' },
      create: {
        phone_number: a.phone,
        role: 'agency',
        status: 'active',
        agency_name: a.name,
        parent_user_id: a.parent,
      },
    });
    agencyUsers[a.phone] = agency.user_id;

    // Assign agency permissions
    const agencyPermissions = ['workers.list', 'workers.assign', 'report.view', 'agency.view'];
    for (const permCode of agencyPermissions) {
      await prisma.userPermissions.create({
        data: {
          user_id: agency.user_id,
          permission_id: permissions[permCode],
          permission_type: 'allow',
        },
      });
    }
  }
  console.log('✅ Agency users seeded:', agenciesData.length);

  // 4. Seed Regular Users
  const usersData = [
    { phone: '0347503890', name: 'John Worker', parent: agencyUsers['0347503887'] },
    { phone: '0347503891', name: 'Jane Smith', parent: agencyUsers['0347503887'] },
    { phone: '0347503892', name: 'Mike Johnson', parent: agencyUsers['0347503888'] },
    { phone: '0347503893', name: 'Sarah Williams', parent: agencyUsers['0347503888'] },
    { phone: '0347503894', name: 'Tom Brown', parent: agencyUsers['0347503889'] },
    { phone: '0347503895', name: 'Emma Davis', parent: agencyUsers['0347503889'] },
  ];

  const regularUsers: { [key: string]: string } = {};
  for (const u of usersData) {
    const user = await prisma.users.upsert({
      where: { phone_number: u.phone },
      update: { status: 'active' },
      create: {
        phone_number: u.phone,
        role: 'user',
        status: 'active',
        agency_name: u.name,
        parent_user_id: u.parent,
      },
    });
    regularUsers[u.phone] = user.user_id;

    // Assign user permissions
    const userPermissions = ['workers.list', 'dashboard.view'];
    for (const permCode of userPermissions) {
      await prisma.userPermissions.create({
        data: {
          user_id: user.user_id,
          permission_id: permissions[permCode],
          permission_type: 'allow',
        },
      });
    }
  }
  console.log('✅ Regular users seeded:', usersData.length);

  // 5. Seed Customers
  const customersData = [
    { phone: '0347503896', name: 'Customer One' },
    { phone: '0347503897', name: 'Customer Two' },
    { phone: '0347503898', name: 'Customer Three' },
  ];

  for (const c of customersData) {
    await prisma.users.upsert({
      where: { phone_number: c.phone },
      update: { status: 'active' },
      create: {
        phone_number: c.phone,
        role: 'customer',
        status: 'active',
        agency_name: c.name,
      },
    });
  }
  console.log('✅ Customer users seeded:', customersData.length);

  // 6. Seed Workers
  const workersData = [
    { name: 'Worker Alpha', status: 'ready' },
    { name: 'Worker Beta', status: 'ready' },
    { name: 'Worker Gamma', status: 'busy' },
    { name: 'Worker Delta', status: 'ready' },
    { name: 'Worker Epsilon', status: 'offline' },
    { name: 'Worker Zeta', status: 'ready' },
  ];

  const workers: { [key: string]: string } = {};
  for (const w of workersData) {
    const worker = await prisma.workers.create({
      data: w,
    });
    workers[w.name] = worker.worker_id;
  }
  console.log('✅ Workers seeded:', workersData.length);

  // 7. Assign Workers to Agencies
  for (const [, agencyId] of Object.entries(agencyUsers)) {
    const workerNames = Object.keys(workers).slice(0, 2);
    for (const workerName of workerNames) {
      await prisma.agencyWorkers.create({
        data: {
          agency_user_id: agencyId,
          worker_id: workers[workerName],
          status: 'active',
        },
      });
    }
  }
  console.log('✅ Workers assigned to agencies');

  console.log('🏁 Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • Permissions: ${Object.keys(permissions).length}`);
  console.log(`   • Mod users: 1`);
  console.log(`   • Agency users: ${agenciesData.length}`);
  console.log(`   • Regular users: ${usersData.length}`);
  console.log(`   • Customers: ${customersData.length}`);
  console.log(`   • Workers: ${workersData.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
