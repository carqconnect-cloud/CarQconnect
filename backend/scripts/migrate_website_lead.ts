import { prisma } from '../src/config/database';

async function main() {
  console.log('--- Migrating misplaced website contact tickets to leads table ---');

  // Find all support tickets created from website contact
  const websiteTickets = await prisma.supportTicket.findMany({
    where: {
      OR: [
        { subject: { contains: 'Website Contact' } },
        { description: { contains: 'Topic: ' } },
      ],
    },
    include: {
      customer: true,
    },
  });

  console.log(`Found ${websiteTickets.length} website contact tickets.`);

  // Find active CarQConnect org
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: { contains: 'carqconnect', mode: 'insensitive' } },
        { name: { contains: 'CarQconnect', mode: 'insensitive' } },
      ],
      isActive: true,
    },
  });
  const orgId = org?.id || 'cmwkfu1iz0000iw013v5f8km4';

  for (const t of websiteTickets) {
    const cust = t.customer;
    const name = cust?.name || 'Website Inquiry';
    const email = cust?.email || undefined;
    const phone = cust?.phone || undefined;

    // Create in leads table
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        name,
        email,
        phone,
        source: 'Website Contact',
        status: 'NEW',
        notes: `${t.subject}\n${t.description}`,
      },
    });

    console.log(`Created Lead: ${lead.id} (${name})`);

    // Delete the support ticket
    await prisma.supportTicket.delete({ where: { id: t.id } }).catch(console.error);

    // If customer has no other tickets or app associations, clean up customer
    if (cust) {
      const otherTickets = await prisma.supportTicket.count({ where: { customerId: cust.id } });
      if (otherTickets === 0) {
        await prisma.customer.delete({ where: { id: cust.id } }).catch(console.error);
        console.log(`Removed customer record: ${cust.id} (${cust.name})`);
      }
    }
  }

  console.log('--- Migration completed successfully ---');
}

main().catch(console.error);
