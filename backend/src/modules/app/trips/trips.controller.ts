import { Request, Response } from 'express';
import { tripsService } from './trips.service';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { ApiError } from '../../../common/utils/apiError';

export const tripsController = {
  async getTrips(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    const trips = await tripsService.getTrips(userId);
    return ApiResponse.ok(res, trips);
  },

  async getTrip(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    const trip = await tripsService.getTripById(userId, req.params.id as string);
    if (!trip) throw ApiError.notFound('Trip not found');

    return ApiResponse.ok(res, trip);
  },

  async createTrip(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    const { fromName, fromLat, fromLng, toName, toLat, toLng } = req.body;
    if (!fromName || !toName || fromLat === undefined || fromLng === undefined || toLat === undefined || toLng === undefined) {
      throw ApiError.badRequest('fromName, toName, and valid coordinates are required');
    }
    if (req.body.status !== undefined && !['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(req.body.status)) {
      throw ApiError.badRequest('Status must be PLANNED, ACTIVE, COMPLETED, or CANCELLED');
    }

    const trip = await tripsService.createTrip(userId, req.body);
    return ApiResponse.created(res, trip);
  },

  async updateTripStatus(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    const { status } = req.body;
    if (!['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw ApiError.badRequest('Status must be ACTIVE, COMPLETED, or CANCELLED');
    }

    const trip = await tripsService.updateTripStatus(userId, req.params.id as string, status);
    if (!trip) throw ApiError.notFound('Trip not found');
    return ApiResponse.ok(res, trip);
  },

  async deleteTrip(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    await tripsService.deleteTrip(userId, req.params.id as string);
    return ApiResponse.noContent(res);
  },
};
