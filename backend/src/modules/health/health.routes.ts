import { Router } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { asyncHandler } from '../../common/utils/asyncHandler';

export const healthRouter = Router();

/** Liveness — is the process up? Used by load balancers. */
healthRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      environment: env.NODE_ENV,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

/** Readiness — can we actually serve traffic (DB reachable)? */
healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const startedAt = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        data: { status: 'ready', database: 'up', latencyMs: Date.now() - startedAt },
      });
    } catch {
      res.status(503).json({
        success: false,
        error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Database is not reachable' },
      });
    }
  }),
);

/** Detailed telemetry — memory, CPU, database latency, and system health for monitoring */
healthRouter.get(
  '/detailed',
  asyncHandler(async (_req, res) => {
    const startedAt = Date.now();
    let dbStatus = 'down';
    let dbLatencyMs = -1;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
      dbLatencyMs = Date.now() - startedAt;
    } catch {
      dbStatus = 'down';
    }

    const memoryUsage = process.memoryUsage();
    const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    res.json({
      success: true,
      data: {
        status: dbStatus === 'up' ? 'healthy' : 'degraded',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        memory: {
          rssMb: toMb(memoryUsage.rss),
          heapTotalMb: toMb(memoryUsage.heapTotal),
          heapUsedMb: toMb(memoryUsage.heapUsed),
          externalMb: toMb(memoryUsage.external),
        },
      },
    });
  }),
);
