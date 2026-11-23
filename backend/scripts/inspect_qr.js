const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- QR_CODES (Inventory) ---');
  const codes = await prisma.qrCode.findMany();
  console.log(JSON.stringify(codes, null, 2));

  console.log('--- QR_TAGS (Vehicle Linked) ---');
  const tags = await prisma.qrTag.findMany();
  console.log(JSON.stringify(tags, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
