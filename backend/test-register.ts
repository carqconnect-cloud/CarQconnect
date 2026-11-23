const { authRepository } = require('./src/modules/auth/auth.repository.ts');
const { hashPassword } = require('./src/common/utils/password.ts');

async function main() {
  try {
    const passwordHash = await hashPassword('Password123!');
    const res = await authRepository.createUserWithOrganization({
      user: {
        email: 'test500@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
      },
      organizationName: 'Test Org',
      slug: 'test-org-1'
    });
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
main();
