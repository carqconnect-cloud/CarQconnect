const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.crmUser.findUnique({ where: { email: 'admin@fioner.test' } });
  console.log('Admin Org:', admin?.organizationId);
  const cust = await prisma.customer.findFirst();
  console.log('Cust Org:', cust?.organizationId);
  
  // also check if admin needs to see all customers regardless of org? 
  // Wait, if it's a super-admin, maybe they should see everything? 
  // No, CRM Users are scoped to orgs. 
  
  if (admin && cust && admin.organizationId !== cust.organizationId) {
    console.log('Mismatch detected. Updating customer to belong to admin org...');
    await prisma.customer.updateMany({
      data: { organizationId: admin.organizationId }
    });
    console.log('Updated customer orgId to admin orgId.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
