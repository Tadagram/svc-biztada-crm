import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.users.findUnique({
    where: { user_id: '727bbc7d-6757-41bc-a8fc-d3643d395ebf' }
  });
  console.log('USER:', user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
