const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('--- ALL PUBLIC TABLES IN DATABASE ---');
  for (const row of tables) {
    try {
      const count = await prisma.$queryRawUnsafe(`SELECT count(*)::int as count FROM "${row.table_name}"`);
      console.log(`${row.table_name}: ${count[0].count} rows`);
    } catch (e) {
      console.log(`${row.table_name}: error reading count (${e.message})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
