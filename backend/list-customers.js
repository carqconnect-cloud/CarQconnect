const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const customers = await prisma.customer.findMany();
  console.log(customers);
}
main().catch(console.error).finally(() => prisma.$disconnect());
