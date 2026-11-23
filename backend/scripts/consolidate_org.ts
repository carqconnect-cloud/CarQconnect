import { prisma } from '../src/config/database';

async function consolidate() {
  const primaryOrgId = 'cmv0tt0bc0000i6ngjtvt0jff';

  console.log('--- Step 1: Renaming primary org ---');
  const updatedPrimary = await prisma.organization.update({
    where: { id: primaryOrgId },
    data: {
      name: 'Fioner (CarQConnect)',
      slug: 'fioner-carqconnect',
    },
  });
  console.log('Primary org updated:', updatedPrimary.name, updatedPrimary.id);

  console.log('--- Step 2: Re-linking customers ---');
  const customerUpdate = await prisma.customer.updateMany({
    data: { organizationId: primaryOrgId },
  });
  console.log('Customers re-linked to primary org:', customerUpdate.count);

  console.log('--- Step 3: Re-linking leads ---');
  const leadUpdate = await prisma.lead.updateMany({
    data: { organizationId: primaryOrgId },
  });
  console.log('Leads re-linked to primary org:', leadUpdate.count);

  console.log('--- Step 4: Re-linking support tickets ---');
  const ticketUpdate = await prisma.supportTicket.updateMany({
    data: { organizationId: primaryOrgId },
  });
  console.log('Tickets re-linked to primary org:', ticketUpdate.count);

  console.log('--- Step 5: Re-linking crmUsers ---');
  const crmUserUpdate = await prisma.crmUser.updateMany({
    data: { organizationId: primaryOrgId },
  });
  console.log('CrmUsers re-linked to primary org:', crmUserUpdate.count);

  console.log('--- Step 6: Reconciling memberships ---');
  const memberships = await prisma.membership.findMany();
  for (const m of memberships) {
    if (m.organizationId === primaryOrgId) continue;
    const existing = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: m.userId,
          organizationId: primaryOrgId,
        },
      },
    });
    if (existing) {
      await prisma.membership.delete({ where: { id: m.id } });
    } else {
      await prisma.membership.update({
        where: { id: m.id },
        data: { organizationId: primaryOrgId },
      });
    }
  }
  console.log('Memberships reconciled.');

  console.log('--- Step 7: Refresh tokens ---');
  await prisma.refreshToken.updateMany({
    where: { organizationId: { not: null } },
    data: { organizationId: primaryOrgId },
  });

  console.log('--- Step 8: Deleting 13 dummy organizations ---');
  const deletedOrgs = await prisma.organization.deleteMany({
    where: { id: { not: primaryOrgId } },
  });
  console.log('Deleted dummy organizations:', deletedOrgs.count);

  console.log('--- Step 9: Verifying final state ---');
  const remainingOrgs = await prisma.organization.findMany();
  console.log('Remaining organizations in DB:', remainingOrgs);

  const finalCustomers = await prisma.customer.findMany({
    select: { id: true, name: true, email: true, organizationId: true },
  });
  console.log('Final customers in DB:', finalCustomers);
}

consolidate()
  .then(() => {
    console.log('Consolidation complete successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Consolidation error:', err);
    process.exit(1);
  });
