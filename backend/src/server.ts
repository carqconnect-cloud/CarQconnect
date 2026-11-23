import type { Server } from 'node:http';
import https from 'node:https';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { syncAllUsersToCustomers } from './common/utils/customerSync';
import { initSocketServer } from './common/services/socket.service';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // Heavy full-database sync is disabled on startup to prevent exceeding the 512MB RAM limit on cloud instances.
  // Individual users are already synced automatically whenever their data changes.
  if (process.env.RUN_INITIAL_SYNC === 'true') {
    void syncAllUsersToCustomers().catch((err) =>
      logger.error({ err }, 'Initial customer sync failed')
    );
  }

  const app = createApp();
  const server: Server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      `Fioner API listening on http://0.0.0.0:${env.PORT}${env.API_PREFIX}/v1 [${env.NODE_ENV}]`,
    );

    // Initialize real-time WebSocket / Socket.IO gateway
    initSocketServer(server);

    // Keep cloud instances (e.g. Render free tier) active while the server is up
    if (env.NODE_ENV === 'production' || process.env.RENDER) {
      const publicUrl = process.env.PUBLIC_URL || 'https://fioner-h5r7.onrender.com';
      const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
      setInterval(() => {
        https
          .get(`${publicUrl}/api/v1/health`, (res) => {
            logger.debug({ statusCode: res.statusCode }, 'Keep-alive ping completed');
          })
          .on('error', (err) => {
            logger.warn({ err: err.message }, 'Keep-alive ping notice');
          });
      }, KEEP_ALIVE_INTERVAL).unref();
    }
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    // Do not hang forever on open sockets.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception - exiting');
    process.exit(1);
  });
}

void bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
