import 'dotenv/config';
import { z } from 'zod';

const POSTGRES_PROTOCOLS = new Set(['postgresql:', 'postgres:']);

const INSECURE_PLACEHOLDER_SUBSTRINGS = [
  'change-me',
  'example',
  'placeholder',
  'secret-that-is',
  'your-secret',
  'long-random-string',
  'default-secret',
];

function isValidPostgresUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return POSTGRES_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function isKnownPlaceholder(secret: string): boolean {
  const lower = secret.toLowerCase();
  return INSECURE_PLACEHOLDER_SUBSTRINGS.some((sub) => lower.includes(sub));
}

function isValidOrigin(origin: string): boolean {
  if (origin === '*' || !origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    // Must be origin-only: no path, query, hash, or trailing slash
    return url.origin === origin;
  } catch {
    return false;
  }
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    API_PREFIX: z.string().startsWith('/').default('/api'),

    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        isValidPostgresUrl,
        'DATABASE_URL must be a valid postgresql:// or postgres:// connection URL',
      ),
    DIRECT_URL: z
      .string()
      .optional()
      .refine(
        (val) => !val || isValidPostgresUrl(val),
        'DIRECT_URL must be a valid postgresql:// or postgres:// connection URL if provided',
      ),

    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL: z.string().default('1h'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    CORS_ORIGINS: z.string().optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
    CUSTOM_SEARCH_API: z.string().optional().default(process.env.Custom_Search_API || process.env.CUSTOM_SEARCH_API || ''),
    ENGINE_ID: z.string().optional().default(process.env.ENGINE_ID || ''),
    SUPER_ADMIN_SECURITY_KEY: z.string().default(process.env.SUPER_ADMIN_SECURITY_KEY || ''),
    FAST2SMS_API_KEY: z.string().optional().default(process.env.FAST2SMS_API_KEY || ''),
    MSG91_AUTH_KEY: z.string().optional().default(process.env.MSG91_Auth_KEY || process.env.MSG91_AUTH_KEY || ''),
    MSG91_TEMPLATE_ID: z.string().optional().default(process.env.MSG91_TEMPLATE_ID || ''),
    MSG91_WIDGET_ID: z.string().optional().default(process.env.MSG91_WIDGET_ID || ''),
    MSG91_TOKEN_AUTH: z.string().optional().default(process.env.MSG91_TOKEN_AUTH || ''),
    SENDGRID_API_KEY: z
      .string()
      .optional()
      .default(process.env.SENDGRID_API_KEY || ''),
    SENDGRID_FROM_EMAIL: z
      .string()
      .optional()
      .default(
        process.env.SENDGRID_FROM_EMAIL ||
          process.env.SENDER_EMAIL ||
          'notifications@fioner.com',
      ),
    SMTP_HOST: z.string().optional().default(process.env.SMTP_HOST || 'smtp.sendgrid.net'),
    SMTP_PORT: z.coerce.number().int().optional().default(Number(process.env.SMTP_PORT) || 587),
    SMTP_SECURE: z.coerce.boolean().optional().default(process.env.SMTP_SECURE === 'true'),
    SMTP_USER: z
      .string()
      .optional()
      .default(
        (process.env.SMTP_HOST || 'smtp.sendgrid.net').includes('sendgrid')
          ? 'apikey'
          : process.env.SMTP_USER || 'apikey',
      ),
    SMTP_PASS: z
      .string()
      .optional()
      .default(process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || ''),
    SMTP_FROM_EMAIL: z
      .string()
      .optional()
      .default(
        process.env.SMTP_FROM_EMAIL ||
          process.env.SENDGRID_FROM_EMAIL ||
          process.env.SENDER_EMAIL ||
          'notifications@fioner.com',
      ),
    SMTP_FROM_NAME: z.string().optional().default(process.env.SMTP_FROM_NAME || 'CarQ Connect'),
    SENDER_EMAIL: z
      .string()
      .optional()
      .default(
        process.env.SENDER_EMAIL ||
          process.env.SENDGRID_FROM_EMAIL ||
          'notifications@fioner.com',
      ),
  })
  .superRefine((data, ctx) => {
    // 1. Secrets must be distinct across all environments
    if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be distinct from JWT_ACCESS_SECRET',
      });
    }

    // 2. Production security assertions
    if (data.NODE_ENV === 'production') {
      if (isKnownPlaceholder(data.JWT_ACCESS_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message:
            'JWT_ACCESS_SECRET contains a known placeholder; production requires a strong, non-default secret',
        });
      }

      if (isKnownPlaceholder(data.JWT_REFRESH_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'JWT_REFRESH_SECRET contains a known placeholder; production requires a strong, non-default secret',
        });
      }

      if (!data.CORS_ORIGINS || data.CORS_ORIGINS.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGINS'],
          message:
            'CORS_ORIGINS is required in production and must list explicit frontend origin(s)',
        });
      } else {
        const origins = data.CORS_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean);

        if (origins.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: 'CORS_ORIGINS must contain at least one valid origin',
          });
        }

        for (const origin of origins) {
          if (!isValidOrigin(origin)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['CORS_ORIGINS'],
              message: `CORS_ORIGINS contains an invalid origin: "${origin}". Must be protocol and host (e.g. https://admin.example.com) with no path or trailing slash, and cannot be "*"`,
            });
          }
        }
      }
    } else {
      // In development/test, validate origin format if supplied
      if (data.CORS_ORIGINS && data.CORS_ORIGINS.trim() !== '') {
        const origins = data.CORS_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean);

        for (const origin of origins) {
          if (!isValidOrigin(origin)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['CORS_ORIGINS'],
              message: `CORS_ORIGINS contains an invalid origin: "${origin}". Must be protocol and host (e.g. http://localhost:3000) with no path or trailing slash, and cannot be "*"`,
            });
          }
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\nInvalid environment configuration:\n${issues}\n\nCopy .env.example to .env.\n`);
  process.exit(1);
}

const raw = parsed.data;
const defaultDevOrigins = 'http://localhost:3000';
const effectiveCors = raw.CORS_ORIGINS && raw.CORS_ORIGINS.trim() !== '' ? raw.CORS_ORIGINS : defaultDevOrigins;

export const env = {
  ...raw,
  CORS_ORIGINS: effectiveCors,
  isProd: raw.NODE_ENV === 'production',
  isDev: raw.NODE_ENV === 'development',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: effectiveCors
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
