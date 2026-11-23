const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking row counts before dropping ---');
  const countVD = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "vehicle_documents";').catch(() => [{ count: 0 }]);
  const countSC = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "sos_contacts";').catch(() => [{ count: 0 }]);
  console.log('vehicle_documents count:', countVD[0]?.count);
  console.log('sos_contacts count:', countSC[0]?.count);

  if (countVD[0]?.count === 0 && countSC[0]?.count === 0) {
    console.log('Dropping duplicate table vehicle_documents...');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "vehicle_documents" CASCADE;');
    console.log('Dropped vehicle_documents.');

    console.log('Dropping duplicate table sos_contacts...');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "sos_contacts" CASCADE;');
    console.log('Dropped sos_contacts.');

    console.log('Duplicate tables successfully dropped from PostgreSQL.');
  } else {
    console.warn('Aborting drop: One of the tables contains records!');
  }
}

main().finally(() => prisma.$disconnect());
