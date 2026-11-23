import { describe, expect, it } from 'vitest';
import { resolveSafeTestDatabaseUrl } from './helpers/testDatabaseSafety';

describe('Test database safety validator (resolveSafeTestDatabaseUrl)', () => {
  it('1. accepts the approved test URL on localhost:5433/fioner_test', () => {
    const input = 'postgresql://fioner:fioner@localhost:5433/fioner_test?schema=public';
    const result = resolveSafeTestDatabaseUrl(input);

    expect(result.wasRedirected).toBe(false);
    expect(result.url).toBe(input);
  });

  it('2. accepts the approved test URL on 127.0.0.1:5433/fioner_test', () => {
    const input = 'postgresql://fioner:fioner@127.0.0.1:5433/fioner_test?schema=public';
    const result = resolveSafeTestDatabaseUrl(input);

    expect(result.wasRedirected).toBe(false);
    expect(result.url).toBe(input);
  });

  it('3. safely redirects the recognized local development URL (localhost:5433/fioner) to fioner_test', () => {
    const input = 'postgresql://fioner:fioner@localhost:5433/fioner?schema=public';
    const result = resolveSafeTestDatabaseUrl(input);

    expect(result.wasRedirected).toBe(true);
    expect(result.url).toBe(
      'postgresql://fioner:fioner@localhost:5433/fioner_test?schema=public',
    );
  });

  it('4. rejects an explicit port 5432 with fail-closed error', () => {
    const input = 'postgresql://fioner:fioner@localhost:5432/fioner_test?schema=public';

    expect(() => resolveSafeTestDatabaseUrl(input)).toThrow(
      /Port 5432 is strictly forbidden/i,
    );
  });

  it('5. rejects a URL with no explicit port (default port not permitted)', () => {
    const input = 'postgresql://fioner:fioner@localhost/fioner_test?schema=public';

    expect(() => resolveSafeTestDatabaseUrl(input)).toThrow(
      /Explicit port 5433 is required/i,
    );
  });

  it('6. rejects an alternate port (e.g. 5434)', () => {
    const input = 'postgresql://fioner:fioner@localhost:5434/fioner_test?schema=public';

    expect(() => resolveSafeTestDatabaseUrl(input)).toThrow(
      /Port '5434' is not permitted/i,
    );
  });

  it('7. rejects a remote hostname', () => {
    const input = 'postgresql://fioner:fioner@db.example.com:5433/fioner_test?schema=public';

    expect(() => resolveSafeTestDatabaseUrl(input)).toThrow(
      /Remote host 'db.example.com' is not permitted/i,
    );
  });

  it('8. rejects the development database name when host is remote (not eligible for redirect)', () => {
    const input = 'postgresql://fioner:fioner@remote-host:5433/fioner?schema=public';

    expect(() => resolveSafeTestDatabaseUrl(input)).toThrow(
      /Remote host 'remote-host' is not permitted/i,
    );
  });

  it('9. rejects the development database name when port is 5432 (not eligible for redirect)', () => {
    const input = 'postgresql://fioner:fioner@localhost:5432/fioner?schema=public';

    expect(() => resolveSafeTestDatabaseUrl(input)).toThrow(
      /Port 5432 is strictly forbidden/i,
    );
  });

  it('10. rejects a different database name on port 5433', () => {
    const input = 'postgresql://fioner:fioner@localhost:5433/other_database?schema=public';

    expect(() => resolveSafeTestDatabaseUrl(input)).toThrow(
      /Database 'other_database' is not permitted/i,
    );
  });

  it('11. provides the default approved test URL when rawUrl is undefined or empty', () => {
    expect(resolveSafeTestDatabaseUrl(undefined)).toEqual({
      url: 'postgresql://fioner:fioner@localhost:5433/fioner_test?schema=public',
      wasRedirected: false,
    });
    expect(resolveSafeTestDatabaseUrl('')).toEqual({
      url: 'postgresql://fioner:fioner@localhost:5433/fioner_test?schema=public',
      wasRedirected: false,
    });
  });

  it('12. never leaks credentials in thrown error messages', () => {
    const sensitivePassword = 'super-secret-password-12345';
    const input = `postgresql://fioner:${sensitivePassword}@localhost:5432/fioner_test`;

    try {
      resolveSafeTestDatabaseUrl(input);
      expect.unreachable('Should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain(sensitivePassword);
      expect(message).not.toContain('fioner:');
    }
  });
});
