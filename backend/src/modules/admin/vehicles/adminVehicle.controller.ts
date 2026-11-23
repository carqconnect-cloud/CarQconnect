import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminVehicleService } from './adminVehicle.service';
import { listAdminVehiclesQuerySchema } from './adminVehicle.schema';

export const adminVehicleController = {
  async list(req: Request, res: Response) {
    const query = listAdminVehiclesQuerySchema.parse(req.query);
    const result = await adminVehicleService.listVehicles(query);
    return ApiResponse.ok(res, result.items, {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPreviousPage: result.page > 1,
      },
    });
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const vehicle = await adminVehicleService.getVehicleById(id);
    return ApiResponse.ok(res, vehicle);
  },
};
