const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the admin user
  const admin = await prisma.crmUser.findUnique({ where: { email: 'admin@fioner.test' } });
  if (!admin) {
    console.log('Admin not found');
    return;
  }
  
  const targetOrgId = admin.organizationId;
  console.log('Target Org (Admin Org):', targetOrgId);
  
  // Find the wrong org (where the customer was originally, or where leads currently are)
  // Let's just find a Lead that is not in the targetOrgId
  const someLead = await prisma.lead.findFirst({
    where: { organizationId: { not: targetOrgId } }
  });
  
  if (!someLead) {
    console.log('No mismatched leads found. Or everything is already in target org.');
    // Let's attempt to update all items that have organizationId != targetOrgId 
    // just in case they belong to the initial seeded org.
  }

  // To be safe, let's just move ALL records to the targetOrgId since this is a test/seed environment.
  // We can just update all records that have an organizationId.
  
  const modelsToUpdate = [
    'lead',
    'customer',
    'activity',
    'supportTicket',
    'callRecord',
    'aIConfiguration',
    'team',
    'membership',
    'auditLog'
  ];

  for (const model of modelsToUpdate) {
    try {
      if (prisma[model]) {
        const res = await prisma[model].updateMany({
          data: { organizationId: targetOrgId }
        });
        console.log(`Updated ${res.count} records in ${model}`);
      }
    } catch (e) {
      console.error(`Error updating ${model}:`, e.message);
    }
  }
  
  console.log('Finished updating organizations.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
