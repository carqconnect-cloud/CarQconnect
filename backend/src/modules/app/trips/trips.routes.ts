import { Router } from 'express';
import { tripsController } from './trips.controller';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const tripsRouter = Router();

tripsRouter.get('/', asyncHandler(tripsController.getTrips));
tripsRouter.get('/:id', asyncHandler(tripsController.getTrip));
tripsRouter.post('/', asyncHandler(tripsController.createTrip));
tripsRouter.patch('/:id/status', asyncHandler(tripsController.updateTripStatus));
tripsRouter.delete('/:id', asyncHandler(tripsController.deleteTrip));
