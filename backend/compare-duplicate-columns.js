const fs = require('fs');
const audit = JSON.parse(fs.readFileSync('db-tables-audit.json', 'utf8'));

const tableMap = {};
audit.forEach(a => { tableMap[a.table] = a; });

const pairs = [
  ['qr_tags', 'qr_codes'],
  ['documents', 'vehicle_documents'],
  ['subscription_plans', 'membership_plans'],
  ['user_subscriptions', 'subscriptions'],
  ['emergency_contacts', 'sos_contacts'],
  ['StoreProduct', 'products'],
  ['store_orders', 'orders'],
  ['users', 'crm_users']
];

for (const [t1, t2] of pairs) {
  console.log(`\n========================================`);
  console.log(`COMPARING: ${t1} (rows: ${tableMap[t1]?.count}) VS ${t2} (rows: ${tableMap[t2]?.count})`);
  console.log(`========================================`);
  console.log(`--- ${t1} columns ---`);
  (tableMap[t1]?.columns || []).forEach(c => console.log('  ', c));
  console.log(`--- ${t2} columns ---`);
  (tableMap[t2]?.columns || []).forEach(c => console.log('  ', c));
}
