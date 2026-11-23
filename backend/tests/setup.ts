import { resolveSafeTestDatabaseUrl } from './helpers/testDatabaseSafety';

/**
 * Loaded before every test file. Unit tests here do NOT need a database;
 * integration tests that do should be named *.int.test.ts and run against
 * a dedicated test database (see docs/TESTING.md).
 */
process.env.NODE_ENV = 'test';

// Enforce parsed and validated safe test database URL before any test or Prisma client initializes.
const { url: safeUrl } = resolveSafeTestDatabaseUrl(process.env.DATABASE_URL);
process.env.DATABASE_URL = safeUrl;
process.env.DIRECT_URL = safeUrl;

process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-that-is-definitely-long-enough';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-that-is-definitely-long-enough';
process.env.LOG_LEVEL ??= 'silent';
