const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.crmUser.findUnique({ where: { email: 'test500@example.com' } });
  console.log('Prisma ok');
}
main().catch(console.error).finally(() => prisma.$disconnect());
