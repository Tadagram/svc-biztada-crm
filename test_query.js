const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const msgs = await prisma.assistantMessage.findMany({
    orderBy: { created_at: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(msgs, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
