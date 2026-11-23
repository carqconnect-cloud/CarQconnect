import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const data = {
    userId: 'cmv0ribpw0000i6xwozgt10al', // Existing user ID (Akshit)
    tokenHash: 'dummyhash12345',
    expiresAt: new Date(Date.now() + 100000),
  };
  try {
    const token = await prisma.refreshToken.create({ data });
    console.log(token);
  } catch (e) {
    console.error(e);
  }
}
main().finally(() => prisma.$disconnect());
