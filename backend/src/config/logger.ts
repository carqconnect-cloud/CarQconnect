import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'fioner-backend' },
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
  transport: env.isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
});

export type Logger = typeof logger;
