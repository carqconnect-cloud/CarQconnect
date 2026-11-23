const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE refresh_tokens RENAME COLUMN "userTeamId" TO "crmUserId";');
  console.log('Renamed column userTeamId to crmUserId');
}
main().catch(console.error).finally(() => prisma.$disconnect());
