const { PrismaClient } = require('@prisma/client');
const { syncUserToCustomer } = require('./src/common/utils/customerSync');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    console.log(`Syncing user ${user.id}...`);
    await syncUserToCustomer(user.id);
  }
  console.log('All users synced successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
