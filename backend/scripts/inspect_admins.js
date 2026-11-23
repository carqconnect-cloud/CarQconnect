const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- crm_users ---');
  const crmUsers = await prisma.crmUser.findMany();
  console.log(JSON.stringify(crmUsers, null, 2));

  console.log('--- super_admins ---');
  const superAdmins = await prisma.superAdmin.findMany();
  console.log(JSON.stringify(superAdmins, null, 2));

  console.log('--- sub_super_admins ---');
  const subAdmins = await prisma.subSuperAdmin.findMany();
  console.log(JSON.stringify(subAdmins, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
