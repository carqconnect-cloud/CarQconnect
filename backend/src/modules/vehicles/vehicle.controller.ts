import type { Request, Response } from 'express';
import { ApiError } from '../../common/utils/apiError';
import { ApiResponse } from '../../common/utils/apiResponse';
import { vehicleService } from './vehicle.service';
import type { CreateVehicleInput, UpdateVehicleInput } from './vehicle.schema';

export const vehicleController = {
  async create(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const input = req.body as CreateVehicleInput;
    const vehicle = await vehicleService.createVehicle(req.auth.userId, input, req.ip);
    return ApiResponse.created(res, vehicle);
  },

  async list(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const vehicles = await vehicleService.listVehicles(req.auth.userId);
    return ApiResponse.ok(res, vehicles);
  },

  async getById(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const vehicle = await vehicleService.getVehicleById(id, req.auth.userId);
    return ApiResponse.ok(res, vehicle);
  },

  async update(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as UpdateVehicleInput;
    const vehicle = await vehicleService.updateVehicle(id, req.auth.userId, input, req.ip);
    return ApiResponse.ok(res, vehicle);
  },

  async delete(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    await vehicleService.deleteVehicle(id, req.auth.userId, req.ip);
    return ApiResponse.noContent(res);
  },

  async linkQr(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const { code } = req.body as { code: string };
    const result = await vehicleService.linkQr(id, req.auth.userId, code, req.ip);
    return ApiResponse.ok(res, result);
  },

  async unlinkQr(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const result = await vehicleService.unlinkQr(id, req.auth.userId, req.ip);
    return ApiResponse.ok(res, result);
  },
};
