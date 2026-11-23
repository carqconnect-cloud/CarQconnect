const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 1: Check admin@connect.com in users and super_admins ---');
  const userAdmin = await prisma.user.findUnique({
    where: { email: 'admin@connect.com' },
  });

  if (userAdmin) {
    console.log('Found admin@connect.com in users table:', userAdmin.id);
    
    // Check if already in super_admins
    let superAdmin = await prisma.superAdmin.findUnique({
      where: { email: 'admin@connect.com' },
    });

    if (!superAdmin) {
      console.log('Creating admin@connect.com in super_admins table...');
      superAdmin = await prisma.superAdmin.create({
        data: {
          email: userAdmin.email,
          passwordHash: userAdmin.passwordHash,
          firstName: userAdmin.firstName || 'Sam',
          lastName: userAdmin.lastName || 'Super',
          phone: userAdmin.phone,
          isActive: true,
          lastLoginAt: userAdmin.lastLoginAt,
        },
      });
      console.log('Created superAdmin:', superAdmin.id);
    } else {
      console.log('admin@connect.com already in super_admins table:', superAdmin.id);
    }

    // Move any refresh tokens or clean them up
    await prisma.refreshToken.deleteMany({
      where: { userId: userAdmin.id },
    });

    // Delete admin@connect.com from users table so users table ONLY has mobile app users!
    await prisma.user.delete({
      where: { id: userAdmin.id },
    });
    console.log('Removed admin@connect.com from users table.');
  } else {
    console.log('admin@connect.com is not in users table.');
  }

  // Summary counts
  const [usersCount, superAdminsCount, subAdminsCount, crmUsersCount] = await Promise.all([
    prisma.user.count(),
    prisma.superAdmin.count(),
    prisma.subSuperAdmin.count(),
    prisma.crmUser.count(),
  ]);

  console.log('--- Current Counts ---');
  console.log('users (Mobile App):', usersCount);
  console.log('super_admins (Super Admin):', superAdminsCount);
  console.log('sub_super_admins (Sub Admin):', subAdminsCount);
  console.log('crm_users (CRM):', crmUsersCount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
