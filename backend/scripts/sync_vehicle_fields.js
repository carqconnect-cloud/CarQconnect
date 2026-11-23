const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count1 = await prisma.$executeRawUnsafe(`
    UPDATE vehicles 
    SET reg = "regNumber" 
    WHERE (reg = '' OR reg IS NULL) AND "regNumber" IS NOT NULL AND "regNumber" != '';
  `);
  console.log('Vehicles reg updated:', count1);

  const count2 = await prisma.$executeRawUnsafe(`
    UPDATE vehicles 
    SET model = name 
    WHERE (model = '' OR model IS NULL) AND name IS NOT NULL AND name != '';
  `);
  console.log('Vehicles model updated:', count2);

  const updated = await prisma.vehicle.findMany();
  console.log('Updated vehicles:', updated.map(v => ({ id: v.id, reg: v.reg, model: v.model, regNumber: v.regNumber, name: v.name })));
}

main().finally(() => prisma.$disconnect());
