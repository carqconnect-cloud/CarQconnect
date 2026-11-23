const data = require('./audit_summary.json');

console.log('Total tables in database:', data.length);
console.log('-------------------------------------------------------------');
console.log('TABLE NAME                  | ROWS | COLUMNS');
console.log('-------------------------------------------------------------');
data.forEach(t => {
  console.log(`${t.table.padEnd(27)} | ${String(t.rows).padStart(4)} | ${t.columns.length} cols`);
});
