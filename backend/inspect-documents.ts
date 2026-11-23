import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { documents: true }
  });
  console.log('User documents:', JSON.stringify(users.map(u => ({ email: u.email, docs: u.documents })), null, 2));

  const customers = await prisma.customer.findMany();
  console.log('Customer documents in metadata:', JSON.stringify(customers.map(c => ({ email: c.email, metadata_docs: (c.metadata as any)?.documents })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
