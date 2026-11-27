import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware';
import { globalRateLimiter } from './common/middleware/rateLimit.middleware';
import { httpLogger, requestId } from './common/middleware/requestLogger.middleware';
import { v1Router } from './routes';

/**
 * Builds the Express app WITHOUT listening on a port, so tests can import it
 * directly (see tests/health.test.ts).
 */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // correct req.ip behind nginx / load balancers
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(compression());

  // Root and Health endpoints for cloud load balancers, uptime monitors, and Render health checks (unthrottled)
  app.get(['/', '/health', `${env.API_PREFIX}/health`, `${env.API_PREFIX}/v1/health`], (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'Fioner API' });
  });
  app.head(['/', '/health', `${env.API_PREFIX}/health`, `${env.API_PREFIX}/v1/health`], (_req, res) => {
    res.status(200).end();
  });

  // Payment webhooks need the untouched body to verify signatures. Register the
  // raw parser BEFORE express.json() and point it at the exact webhook path:
  app.use(`${env.API_PREFIX}/v1/webhooks/razorpay`, express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(globalRateLimiter);

  // Support both /api/v1 and /api routes
  app.use(`${env.API_PREFIX}/v1`, v1Router);
  app.use(env.API_PREFIX, v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler); // must be last

  return app;
}
