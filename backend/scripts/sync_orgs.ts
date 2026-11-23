import { prisma } from '../src/config/database';

async function main() {
  console.log('--- Unifying Leads and Customers under Active CRM Organization ---');
  
  // Find active CarQConnect CRM organization
  const crmUser = await prisma.crmUser.findFirst({
    where: { email: 'admin@carqconnect.com' },
  });
  const orgId = crmUser?.organizationId || 'cmwkfu1iz0000iw013v5f8km4';
  console.log('Target Organization ID:', orgId);

  // 1. Update all leads to this orgId
  const leadsUpdated = await prisma.lead.updateMany({
    where: { organizationId: { not: orgId } },
    data: { organizationId: orgId },
  });
  console.log(`Updated ${leadsUpdated.count} leads to org ${orgId}`);

  // 2. Delete misplaced website inquiry from customers table if present
  const deletedMisplaced = await prisma.customer.deleteMany({
    where: {
      OR: [
        { id: 'cmwlqgbnk0007i301ryq4ck0n' },
        { email: 'akshitnannaware@gmail.com' },
      ],
    },
  });
  console.log(`Removed ${deletedMisplaced.count} misplaced customer records`);

  // 3. Ensure legitimate customers belong to orgId
  const customersUpdated = await prisma.customer.updateMany({
    where: { organizationId: { not: orgId } },
    data: { organizationId: orgId },
  });
  console.log(`Updated ${customersUpdated.count} customers to org ${orgId}`);

  const totalLeads = await prisma.lead.count({ where: { organizationId: orgId } });
  const totalCustomers = await prisma.customer.count({ where: { organizationId: orgId } });
  console.log(`Verified in DB -> Total Leads: ${totalLeads}, Total Customers: ${totalCustomers}`);

  const allLeads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, status: true, source: true },
  });
  console.log('Current Leads in DB:', JSON.stringify(allLeads, null, 2));
}

main().catch(console.error);
