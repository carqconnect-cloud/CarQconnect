import type { RequestHandler } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ErrorCode, HttpStatus } from '../constants/http';

const baseOptions: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: false,
  // Skip limits in tests so suites are not flaky.
  skip: (req) => env.isTest || (process.env.NODE_ENV !== 'production' && req.headers['x-bypass-rate-limit'] === 'test-runner'),
  handler: (req, res) => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      error: { code: ErrorCode.RATE_LIMITED, message: 'Too many requests, please try again later' },
      requestId: req.requestId,
    });
  },
};

/** Applied to every route. */
export const globalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Raw tight limit for login/register/refresh — brute-force protection. */
const rawAuthLimiter = rateLimit({
  ...baseOptions,
  standardHeaders: false, // avoid RateLimit headers collision with globalRateLimiter
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  validate: false,
});

/** Safe auth rate limiter: fails open on proxy/header errors so users can always log in. */
export const authRateLimiter: RequestHandler = (req, res, next) => {
  try {
    rawAuthLimiter(req, res, (err) => {
      if (err) {
        logger.warn({ err }, '[RateLimit] authRateLimiter error; failing open to allow auth');
        return next();
      }
      next();
    });
  } catch (err) {
    logger.warn({ err }, '[RateLimit] authRateLimiter synchronous error; failing open to allow auth');
    next();
  }
};

/** For unauthenticated public endpoints (QR scans, webhooks callbacks, etc). */
export const publicRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60_000,
  limit: 60,
});
