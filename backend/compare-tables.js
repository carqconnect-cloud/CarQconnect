const fs = require('fs');
const path = require('path');

// 1. Read db tables audit
const dbTables = JSON.parse(fs.readFileSync('db-tables-audit.json', 'utf8'));

// 2. Read all .prisma files in prisma/schema
const prismaSchemaDir = path.join(__dirname, 'prisma', 'schema');
const prismaFiles = fs.readdirSync(prismaSchemaDir).filter(f => f.endsWith('.prisma'));

const prismaModels = [];

for (const file of prismaFiles) {
  const content = fs.readFileSync(path.join(prismaSchemaDir, file), 'utf8');
  // match model ModelName { ... @@map("table_name") ... }
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const mapMatch = body.match(/@@map\("([^"]+)"\)/);
    const dbName = mapMatch ? mapMatch[1] : modelName;
    prismaModels.push({
      modelName,
      dbName,
      file
    });
  }
}

// 3. Match DB tables against Prisma models
const analysis = dbTables.map(t => {
  const matched = prismaModels.filter(m => m.dbName === t.table || m.modelName === t.table);
  return {
    table: t.table,
    count: t.count,
    columnsCount: t.columns.length,
    foreignKeys: t.foreignKeys,
    referencedBy: t.referencedBy,
    inPrisma: matched.length > 0,
    prismaModel: matched.map(m => `${m.modelName} (${m.file})`).join(', ')
  };
});

// Group tables
console.log('=== TOTAL DB TABLES:', analysis.length);
console.log('=== IN PRISMA:', analysis.filter(a => a.inPrisma).length);
console.log('=== NOT IN PRISMA:', analysis.filter(a => !a.inPrisma).length);

console.log('\n--- TABLES NOT IN PRISMA: ---');
analysis.filter(a => !a.inPrisma).forEach(a => {
  console.log(`- ${a.table} (rows: ${a.count}, cols: ${a.columnsCount}) refBy: [${a.referencedBy.join(', ')}]`);
});

fs.writeFileSync('db-comparison.json', JSON.stringify(analysis, null, 2));
