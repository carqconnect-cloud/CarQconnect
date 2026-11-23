import type { Request, Response } from 'express';
import { ApiError } from '../../../common/utils/apiError';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminGpsService } from './adminGps.service';
import {
  AssignGpsInput,
  CreateGeofenceInput,
  DeactivateGpsInput,
  ListAdminGpsQuery,
  RegisterGpsDeviceInput,
  UnbindGpsInput,
  RecordTelemetryInput,
} from './adminGps.schema';

export const adminGpsController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ListAdminGpsQuery;
    const result = await adminGpsService.listGpsDevices(query);
    return ApiResponse.ok(res, result.items, {
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.page < result.pagination.totalPages,
        hasPreviousPage: result.pagination.page > 1,
      },
    });
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminGpsService.getGpsDeviceById(id);
    return ApiResponse.ok(res, result);
  },

  async register(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const input = req.body as RegisterGpsDeviceInput;
    const actorId = req.auth.userId;
    const result = await adminGpsService.registerGpsDevice(input, actorId, req.ip);
    return ApiResponse.created(res, result);
  },

  async assign(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as AssignGpsInput;
    const actorId = req.auth.userId;
    const result = await adminGpsService.assignGps(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async unbind(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as UnbindGpsInput;
    const actorId = req.auth.userId;
    const result = await adminGpsService.unbindGps(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async deactivate(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as DeactivateGpsInput;
    const actorId = req.auth.userId;
    const result = await adminGpsService.deactivateGps(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async getTrips(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminGpsService.getTrips(id);
    return ApiResponse.ok(res, result);
  },

  async listGeofences(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminGpsService.listGeofences(id);
    return ApiResponse.ok(res, result);
  },

  async createGeofence(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as CreateGeofenceInput;
    const actorId = req.auth.userId;
    const result = await adminGpsService.createGeofence(id, input, actorId, req.ip);
    return ApiResponse.created(res, result);
  },

  async deleteGeofence(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id, geofenceId } = req.params as { id: string; geofenceId: string };
    const actorId = req.auth.userId;
    const result = await adminGpsService.deleteGeofence(id, geofenceId, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async recordTelemetry(req: Request, res: Response) {
    const input = req.body as RecordTelemetryInput;
    const result = await adminGpsService.recordTelemetry(input);
    return ApiResponse.ok(res, result);
  },

  async getHistory(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminGpsService.getHistory(id);
    return ApiResponse.ok(res, result);
  },
};
