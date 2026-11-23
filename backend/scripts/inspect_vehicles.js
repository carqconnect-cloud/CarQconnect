const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const checkTables = ['vehicles', 'vehicle_documents', 'documents', 'emergency_contacts', 'sos_contacts', 'reminders', 'qr_tags'];
  console.log('--- DATABASE TABLES STATUS ---');
  for (const t of checkTables) {
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT count(*)::int as count FROM "${t}"`);
      console.log(`[EXISTS] Table "${t}" has ${res[0].count} rows`);
    } catch (e) {
      console.log(`[DELETED] Table "${t}" does not exist in database`);
    }
  }

  const vehicles = await prisma.vehicle.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        }
      },
      documents: true,
      qrTag: true,
      qrCode: true,
      gpsDevice: true,
    }
  });
  console.log(`\n--- VEHICLES (Total: ${vehicles.length}) ---`);
  vehicles.forEach(v => {
    console.log(`Vehicle ID: ${v.id}, Reg: ${v.reg || v.regNumber}, Name/Model: ${v.model || v.name}, Documents linked: ${v.documents.length}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
