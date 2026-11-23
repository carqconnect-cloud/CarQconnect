import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminVehicleController } from './adminVehicle.controller';
import { listAdminVehiclesQuerySchema } from './adminVehicle.schema';

export const adminVehicleRoutes = Router();

adminVehicleRoutes.get(
  '/',
  validate({ query: listAdminVehiclesQuerySchema }),
  asyncHandler(adminVehicleController.list),
);
adminVehicleRoutes.get(
  '/:id',
  asyncHandler(adminVehicleController.getById),
);
