import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying database migration for super_admins and sub_super_admins...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "super_admins" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "phone" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "lastLoginAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('✓ super_admins table ensured');

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "super_admins_email_key" ON "super_admins"("email");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "super_admins_isActive_idx" ON "super_admins"("isActive");
  `);
  console.log('✓ super_admins indices ensured');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sub_super_admins" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "phone" TEXT,
      "roleTitle" TEXT NOT NULL DEFAULT 'Sub-Super Admin',
      "permissions" JSONB,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdById" TEXT NOT NULL,
      "lastLoginAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "sub_super_admins_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "sub_super_admins_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('✓ sub_super_admins table ensured');

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "sub_super_admins_email_key" ON "sub_super_admins"("email");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "sub_super_admins_createdById_idx" ON "sub_super_admins"("createdById");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "sub_super_admins_isActive_idx" ON "sub_super_admins"("isActive");
  `);
  console.log('✓ sub_super_admins indices ensured');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "superAdminId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "subSuperAdminId" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_superAdminId_fkey'
      ) THEN
        ALTER TABLE "refresh_tokens" 
        ADD CONSTRAINT "refresh_tokens_superAdminId_fkey" 
        FOREIGN KEY ("superAdminId") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_subSuperAdminId_fkey'
      ) THEN
        ALTER TABLE "refresh_tokens" 
        ADD CONSTRAINT "refresh_tokens_subSuperAdminId_fkey" 
        FOREIGN KEY ("subSuperAdminId") REFERENCES "sub_super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "refresh_tokens_superAdminId_idx" ON "refresh_tokens"("superAdminId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "refresh_tokens_subSuperAdminId_idx" ON "refresh_tokens"("subSuperAdminId");
  `);
  console.log('✓ refresh_tokens columns & constraints ensured');

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
