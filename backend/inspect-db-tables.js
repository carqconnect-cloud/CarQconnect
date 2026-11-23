const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  // 1. Get all base tables in public schema
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const results = [];

  for (const t of tables) {
    const tableName = t.table_name;

    // Get row count
    let count = 0;
    try {
      const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${tableName}"`);
      count = countRes[0].count;
    } catch (e) {
      count = 'ERR: ' + e.message;
    }

    // Get columns
    const colsRes = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `);

    // Get foreign keys defined on this table
    const fkRes = await prisma.$queryRawUnsafe(`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '${tableName}';
    `);

    // Get foreign keys pointing to this table
    const referencedByRes = await prisma.$queryRawUnsafe(`
      SELECT
        tc.table_name AS dependent_table,
        kcu.column_name AS dependent_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = '${tableName}';
    `);

    results.push({
      table: tableName,
      count,
      columns: colsRes.map(c => `${c.column_name} (${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''})`),
      foreignKeys: fkRes.map(f => `${f.column_name} -> ${f.foreign_table_name}.${f.foreign_column_name}`),
      referencedBy: referencedByRes.map(r => `${r.dependent_table}.${r.dependent_column}`)
    });
  }

  fs.writeFileSync('db-tables-audit.json', JSON.stringify(results, null, 2));
  console.log(`Audited ${results.length} tables successfully.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
