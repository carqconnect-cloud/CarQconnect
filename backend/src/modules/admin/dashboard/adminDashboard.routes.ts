import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { cacheResponse } from '../../../common/utils/cache';
import { adminDashboardController } from './adminDashboard.controller';
import {
  getAdminDashboardAlertsSchema,
  getAdminDashboardOverviewSchema,
} from './adminDashboard.schema';

export const adminDashboardRoutes = Router();

adminDashboardRoutes.get(
  '/',
  cacheResponse(30, 'admin:dashboard'),
  validate({ query: getAdminDashboardOverviewSchema }),
  asyncHandler(adminDashboardController.getExecutiveOverview),
);

adminDashboardRoutes.get(
  '/executive',
  cacheResponse(30, 'admin:dashboard:executive'),
  validate({ query: getAdminDashboardOverviewSchema }),
  asyncHandler(adminDashboardController.getExecutiveOverview),
);

adminDashboardRoutes.get(
  '/alerts',
  cacheResponse(20, 'admin:dashboard:alerts'),
  validate({ query: getAdminDashboardAlertsSchema }),
  asyncHandler(adminDashboardController.getOperationalAlerts),
);

adminDashboardRoutes.get(
  '/system-health',
  cacheResponse(15, 'admin:dashboard:health'),
  asyncHandler(adminDashboardController.getSystemHealth),
);
