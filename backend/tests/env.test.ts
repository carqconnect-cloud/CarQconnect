import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { envSchema } from '../src/config/env';
import { createApp } from '../src/app';

const BASE_VALID_INPUT = {
  NODE_ENV: 'development',
  PORT: 4000,
  API_PREFIX: '/api',
  DATABASE_URL: 'postgresql://user:pass@localhost:5433/fioner?schema=public',
  JWT_ACCESS_SECRET: 'a-valid-random-access-secret-that-is-over-32-chars-long',
  JWT_REFRESH_SECRET: 'a-valid-random-refresh-secret-that-is-over-32-chars-long',
};

describe('Environment Configuration Validation (envSchema)', () => {
  it('accepts valid development configuration with defaults', () => {
    const result = envSchema.safeParse(BASE_VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(4000);
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.DATABASE_URL).toBe(BASE_VALID_INPUT.DATABASE_URL);
    }
  });

  it('rejects identical access and refresh secrets in development', () => {
    const secret = 'identical-secret-value-that-exceeds-thirty-two-chars';
    const result = envSchema.safeParse({
      ...BASE_VALID_INPUT,
      JWT_ACCESS_SECRET: secret,
      JWT_REFRESH_SECRET: secret,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('JWT_REFRESH_SECRET'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('must be distinct');
    }
  });

  describe('Production Mode Security Assertions', () => {
    const PROD_BASE = {
      ...BASE_VALID_INPUT,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'strong-production-access-token-secret-9876543210',
      JWT_REFRESH_SECRET: 'strong-production-refresh-token-secret-0123456789',
      CORS_ORIGINS: 'https://fioner.com,https://admin.fioner.com',
    };

    it('accepts valid production configuration with distinct secrets and explicit origins', () => {
      const result = envSchema.safeParse(PROD_BASE);
      expect(result.success).toBe(true);
    });

    it('rejects known example placeholder for JWT_ACCESS_SECRET in production', () => {
      const result = envSchema.safeParse({
        ...PROD_BASE,
        JWT_ACCESS_SECRET: 'change-me-to-a-long-random-string-at-least-32-chars',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('JWT_ACCESS_SECRET'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('known placeholder');
        // Critical: Ensure secret value itself is NOT leaked in the error message
        expect(issue?.message).not.toContain('change-me-to-a-long-random-string');
      }
    });

    it('rejects known example placeholder for JWT_REFRESH_SECRET in production', () => {
      const result = envSchema.safeParse({
        ...PROD_BASE,
        JWT_REFRESH_SECRET: 'example-refresh-secret-that-is-sufficiently-long-for-zod',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('JWT_REFRESH_SECRET'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('known placeholder');
      }
    });

    it('rejects missing or empty CORS_ORIGINS in production', () => {
      const result = envSchema.safeParse({
        ...PROD_BASE,
        CORS_ORIGINS: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('CORS_ORIGINS'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('CORS_ORIGINS is required in production');
      }
    });

    it('rejects localhost origins in production CORS_ORIGINS', () => {
      const result = envSchema.safeParse({
        ...PROD_BASE,
        CORS_ORIGINS: 'https://fioner.com,http://localhost:3000',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('CORS_ORIGINS'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('must not contain localhost');
      }
    });

    it('rejects wildcard origin (*) in CORS_ORIGINS', () => {
      const result = envSchema.safeParse({
        ...PROD_BASE,
        CORS_ORIGINS: '*',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('CORS_ORIGINS'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('invalid origin');
      }
    });

    it('rejects origin with trailing slash or URL subpath', () => {
      const result = envSchema.safeParse({
        ...PROD_BASE,
        CORS_ORIGINS: 'https://fioner.com/api',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('CORS_ORIGINS'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('Must be protocol and host');
      }
    });
  });

  describe('Database URL and Protocol Validation', () => {
    it('accepts valid postgresql:// and postgres:// connection strings', () => {
      const res1 = envSchema.safeParse({
        ...BASE_VALID_INPUT,
        DATABASE_URL: 'postgresql://fioner:pass@render-db-host:5432/fioner',
      });
      expect(res1.success).toBe(true);

      const res2 = envSchema.safeParse({
        ...BASE_VALID_INPUT,
        DATABASE_URL: 'postgres://fioner:pass@render-db-host:5432/fioner',
      });
      expect(res2.success).toBe(true);
    });

    it('rejects non-PostgreSQL protocols without leaking connection parameters', () => {
      const sensitiveUrl = 'mysql://sensitive_user:super_secret_pw@db.example.com:3306/db';
      const result = envSchema.safeParse({
        ...BASE_VALID_INPUT,
        DATABASE_URL: sensitiveUrl,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('DATABASE_URL'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('must be a valid postgresql:// or postgres:// connection URL');
        // Verify credentials are not echoed in the error message
        expect(issue?.message).not.toContain('super_secret_pw');
        expect(issue?.message).not.toContain('sensitive_user');
      }
    });

    it('validates optional DIRECT_URL when provided', () => {
      const validDirect = envSchema.safeParse({
        ...BASE_VALID_INPUT,
        DIRECT_URL: 'postgresql://fioner:pass@direct-db:5432/fioner',
      });
      expect(validDirect.success).toBe(true);

      const invalidDirect = envSchema.safeParse({
        ...BASE_VALID_INPUT,
        DIRECT_URL: 'not-a-valid-url',
      });
      expect(invalidDirect.success).toBe(false);
      if (!invalidDirect.success) {
        const issue = invalidDirect.error.issues.find((i) => i.path.includes('DIRECT_URL'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('DIRECT_URL must be a valid postgresql:// or postgres://');
      }
    });

    it('allows startup without any third-party credentials', () => {
      // Input contains only core variables; no Razorpay, Exotel, MSG91, Redis, etc.
      const result = envSchema.safeParse(BASE_VALID_INPUT);
      expect(result.success).toBe(true);
    });
  });

  describe('Logger Redaction Safety', () => {
    it('redacts sensitive fields when logged in structured objects', () => {
      let loggedOutput = '';
      const testLogger = pino(
        {
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'password',
              '*.password',
              'passwordHash',
              '*.passwordHash',
              'refreshToken',
              '*.refreshToken',
              'accessToken',
              '*.accessToken',
              'jwt',
              '*.jwt',
              'token',
              '*.token',
              'apiKey',
              '*.apiKey',
              'apiToken',
              '*.apiToken',
              'keySecret',
              '*.keySecret',
              'secret',
              '*.secret',
              'webhookSecret',
              '*.webhookSecret',
              'privateKey',
              '*.privateKey',
              'clientSecret',
              '*.clientSecret',
              'databaseUrl',
              '*.databaseUrl',
              'directUrl',
              '*.directUrl',
            ],
            censor: '[redacted]',
          },
        },
        {
          write(msg: string) {
            loggedOutput += msg;
          },
        },
      );

      testLogger.info({
        event: 'user_login',
        password: 'raw_user_password_123',
        refreshToken: 'raw_refresh_token_xyz',
        apiKey: 'sk_live_secret_key_abc',
        keySecret: 'razorpay_secret_key_def',
        webhookSecret: 'webhook_signing_secret_ghi',
        databaseUrl: 'postgresql://fioner:secret_db_pass@host:5432/fioner',
        nested: {
          token: 'nested_bearer_token_jkl',
          privateKey: 'pem_private_key_content',
        },
        safeData: 'visible_identifier',
      });

      const parsedLog = JSON.parse(loggedOutput);
      expect(parsedLog.safeData).toBe('visible_identifier');
      expect(parsedLog.password).toBe('[redacted]');
      expect(parsedLog.refreshToken).toBe('[redacted]');
      expect(parsedLog.apiKey).toBe('[redacted]');
      expect(parsedLog.keySecret).toBe('[redacted]');
      expect(parsedLog.webhookSecret).toBe('[redacted]');
      expect(parsedLog.databaseUrl).toBe('[redacted]');
      expect(parsedLog.nested.token).toBe('[redacted]');
      expect(parsedLog.nested.privateKey).toBe('[redacted]');
    });
  });

  describe('Health Endpoint Safety', () => {
    it('GET /api/v1/health does not expose environment values or secrets', async () => {
      const app = createApp();
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.environment).toBeDefined();

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('secret');
      expect(bodyStr).not.toContain('postgresql:');
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('5433');
    });
  });
});
