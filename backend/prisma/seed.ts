import { LeadStatus, MembershipStatus, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Password123';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const organization = await prisma.organization.upsert({
    where: { slug: 'fioner-demo' },
    update: {},
    create: { name: 'Fioner Demo', slug: 'fioner-demo' },
  });

  const people = [
    { email: 'admin@fioner.test', firstName: 'Administrative', lastName: 'Admin', role: Role.ADMIN },
    { email: 'teamhead@fioner.test', firstName: 'Team', lastName: 'Head', role: Role.TEAM_HEAD },
    { email: 'employee@fioner.test', firstName: 'Executive', lastName: 'Employee', role: Role.EXECUTIVE },
  ];
  

  for (const person of people) {
    await prisma.crmUser.upsert({
      where: { email: person.email },
      update: {
        firstName: person.firstName,
        lastName: person.lastName,
        passwordHash,
        role: person.role,
        organizationId: organization.id,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        passwordHash,
        role: person.role,
        organizationId: organization.id,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: 'admin@connect.com' },
    update: { isSuperAdmin: true },
    create: {
      email: 'admin@connect.com',
      firstName: 'Sam',
      lastName: 'Super',
      passwordHash,
      isSuperAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });

  const existingLeads = await prisma.lead.count({ where: { organizationId: organization.id } });
  if (existingLeads === 0) {
    await prisma.lead.createMany({
      data: [
        {
          organizationId: organization.id,
          name: 'Rahul Sharma',
          company: 'Indore Motors',
          email: 'rahul@example.com',
          status: LeadStatus.NEW,
          source: 'website',
          value: 45000,
        },
        {
          organizationId: organization.id,
          name: 'Priya Nair',
          company: 'Nair Logistics',
          email: 'priya@example.com',
          status: LeadStatus.QUALIFIED,
          source: 'referral',
          value: 120000,
        },
        {
          organizationId: organization.id,
          name: 'Imran Khan',
          company: 'Khan Traders',
          phone: '+919876543210',
          status: LeadStatus.PROPOSAL,
          source: 'qr-scan',
          value: 78000,
        },
        {
          organizationId: organization.id,
          name: 'Sneha Patel',
          company: 'Patel Foods',
          email: 'sneha@example.com',
          status: LeadStatus.WON,
          source: 'website',
          value: 210000,
        },
      ],
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded "${organization.name}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
