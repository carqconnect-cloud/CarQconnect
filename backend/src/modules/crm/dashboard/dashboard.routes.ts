import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { cacheResponse } from '../../../common/utils/cache';
import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', cacheResponse(30, 'crm:dashboard'), asyncHandler(dashboardController.stats));
dashboardRouter.get('/notifications', cacheResponse(15, 'crm:notifications'), asyncHandler(dashboardController.notifications));
dashboardRouter.get('/report', cacheResponse(60, 'crm:report'), asyncHandler(dashboardController.report));
