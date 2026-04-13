import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DANH SÁCH CÁC BẢNG TRONG PRISMA CLIENT ---');
  const keys = Object.keys(prisma).filter((key) => !key.startsWith('_') && !key.startsWith('$'));
  console.log(keys);
  console.log('----------------------------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
