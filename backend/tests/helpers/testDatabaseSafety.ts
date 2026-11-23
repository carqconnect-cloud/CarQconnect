export interface SafeTestUrlResult {
  url: string;
  wasRedirected: boolean;
}

const APPROVED_TEST_URL = 'postgresql://fioner:fioner@localhost:5433/fioner_test?schema=public';
const ALLOWED_PROTOCOLS = new Set(['postgresql:', 'postgres:']);
const ALLOWED_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);
const APPROVED_PORT = '5433';
const APPROVED_TEST_DB = 'fioner_test';
const RECOGNIZED_DEV_DB = 'fioner';

/**
 * Validates and safely resolves the test database URL.
 *
 * Rules:
 * 1. Must use postgresql: or postgres: protocol.
 * 2. Must target loopback host (localhost or 127.0.0.1).
 * 3. Must specify an explicit port matching 5433 (no default port, no alternate port, port 5432 strictly rejected).
 * 4. If pointing to the exact, recognized local development target (localhost:5433/fioner),
 *    narrowly redirects it to 'fioner_test'.
 * 5. If pointing to any other database or ineligible target, rejects it.
 * 6. Never logs credentials or full connection URLs.
 */
export function resolveSafeTestDatabaseUrl(rawUrl?: string): SafeTestUrlResult {
  if (!rawUrl || rawUrl.trim() === '') {
    return {
      url: APPROVED_TEST_URL,
      wasRedirected: false,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Unsafe test database configuration: Invalid DATABASE_URL format.');
  }

  // 1. Protocol check
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(
      `Unsafe test database configuration: Invalid protocol '${parsed.protocol}'. Expected postgresql:.`,
    );
  }

  // 2. Port check
  if (parsed.port === '5432') {
    throw new Error(
      'Unsafe test database configuration: Port 5432 is strictly forbidden (reserved for Zero Brokerage).',
    );
  }

  if (!parsed.port) {
    throw new Error(
      'Unsafe test database configuration: Explicit port 5433 is required; default PostgreSQL port is not permitted.',
    );
  }

  if (parsed.port !== APPROVED_PORT) {
    throw new Error(
      `Unsafe test database configuration: Port '${parsed.port}' is not permitted. Only port 5433 is allowed.`,
    );
  }

  // 3. Host check
  if (!ALLOWED_LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Unsafe test database configuration: Remote host '${parsed.hostname}' is not permitted. Only loopback (localhost or 127.0.0.1) is allowed.`,
    );
  }

  // 4. Database name check
  const dbName = parsed.pathname.replace(/^\//, '');

  if (dbName === RECOGNIZED_DEV_DB) {
    // Narrowly redirect only the exact, recognized local development target on localhost:5433
    parsed.pathname = `/${APPROVED_TEST_DB}`;
    return {
      url: parsed.toString(),
      wasRedirected: true,
    };
  }

  if (dbName === APPROVED_TEST_DB) {
    return {
      url: parsed.toString(),
      wasRedirected: false,
    };
  }

  throw new Error(
    `Unsafe test database configuration: Database '${dbName}' is not permitted. Only '${APPROVED_TEST_DB}' is allowed for tests.`,
  );
}
