import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../../config/logger';
import { REQUEST_ID_HEADER } from '../constants';

/** Assigns/propagates a request id so logs and error responses can be matched up. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? crypto.randomUUID();
  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as { requestId?: string }).requestId ?? crypto.randomUUID(),
  autoLogging: {
    ignore: (req) => req.url === '/api/v1/health' || req.url === '/health',
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
