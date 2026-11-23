const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const result = [];
  for (const row of tables) {
    const t = row.table_name;
    try {
      const countRes = await prisma.$queryRawUnsafe(`SELECT count(*)::int as count FROM "${t}"`);
      const cols = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '${t}'
        ORDER BY ordinal_position;
      `);

      let samples = [];
      if (countRes[0].count > 0 && countRes[0].count <= 5) {
        samples = await prisma.$queryRawUnsafe(`SELECT * FROM "${t}" LIMIT 3`);
      }

      result.push({
        table: t,
        rows: countRes[0].count,
        columns: cols.map(c => `${c.column_name} (${c.data_type})`),
        samples,
      });
    } catch (e) {
      result.push({ table: t, error: e.message });
    }
  }

  fs.writeFileSync('scripts/audit_summary.json', JSON.stringify(result, null, 2), 'utf8');
  console.log(`Audited ${result.length} tables successfully.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
