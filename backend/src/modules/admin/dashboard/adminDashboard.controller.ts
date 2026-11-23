import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminDashboardService } from './adminDashboard.service';
import type {
  GetAdminDashboardAlertsInput,
  GetAdminDashboardOverviewInput,
} from './adminDashboard.schema';

export const adminDashboardController = {
  async getExecutiveOverview(req: Request, res: Response) {
    const result = await adminDashboardService.getExecutiveOverview(
      req.query as unknown as GetAdminDashboardOverviewInput,
    );
    return ApiResponse.ok(res, result);
  },

  async getOperationalAlerts(req: Request, res: Response) {
    const result = await adminDashboardService.getOperationalAlerts(
      req.query as unknown as GetAdminDashboardAlertsInput,
    );
    return ApiResponse.ok(res, result);
  },

  async getSystemHealth(_req: Request, res: Response) {
    const result = await adminDashboardService.getSystemHealth();
    return ApiResponse.ok(res, result);
  },
};
