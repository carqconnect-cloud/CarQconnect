const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Orgs:', await prisma.organization.findMany());
  console.log('CrmUsers:', await prisma.crmUser.findMany());
  console.log('Users:', await prisma.user.findMany());
}
main().catch(console.error).finally(() => prisma.$disconnect());
