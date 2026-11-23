const fs = require('fs');
const path = require('path');

const data = require('./db-comparison.json');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const backendSrcFiles = scanDir(path.join(__dirname, 'src'));

const usageResults = [];

for (const t of data) {
  const modelName = t.prismaModel ? t.prismaModel.split(' ')[0] : null;
  const dbTableName = t.table;

  const hits = [];

  for (const file of backendSrcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relFile = path.relative(__dirname, file).replace(/\\/g, '/');

    // check prisma.<camelCaseModel>
    if (modelName) {
      const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      if (content.includes(`prisma.${camelModel}`) || content.includes(`.${camelModel}.`)) {
        hits.push({ file: relFile, match: `prisma.${camelModel}` });
      }
    }

    // check raw table queries
    if (content.includes(`"${dbTableName}"`) || content.includes(`'${dbTableName}'`) || content.includes(`FROM ${dbTableName}`) || content.includes(`JOIN ${dbTableName}`)) {
      hits.push({ file: relFile, match: `raw:${dbTableName}` });
    }
  }

  usageResults.push({
    table: t.table,
    count: t.count,
    columnsCount: t.columnsCount,
    prismaModel: t.prismaModel,
    referencedBy: t.referencedBy,
    codeHitsCount: hits.length,
    codeHitFiles: [...new Set(hits.map(h => h.file))]
  });
}

fs.writeFileSync('table-usage-audit.json', JSON.stringify(usageResults, null, 2));

console.log('=== USAGE AUDIT COMPLETED ===');
const unusedInBackend = usageResults.filter(u => u.codeHitsCount === 0);
console.log(`Total Tables: ${usageResults.length}`);
console.log(`Used in backend code: ${usageResults.length - unusedInBackend.length}`);
console.log(`NOT queried in backend code: ${unusedInBackend.length}`);
console.log('\n--- Tables with 0 references in backend code ---');
unusedInBackend.forEach(u => {
  console.log(`- ${u.table} (rows: ${u.count}, model: ${u.prismaModel || 'None'}, refBy: ${u.referencedBy.length})`);
});
