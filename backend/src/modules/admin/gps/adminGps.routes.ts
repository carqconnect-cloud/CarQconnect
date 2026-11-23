import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminGpsController } from './adminGps.controller';
import {
  assignGpsSchema,
  createGeofenceSchema,
  deactivateGpsSchema,
  listAdminGpsQuerySchema,
  registerGpsDeviceSchema,
  unbindGpsSchema,
  recordTelemetrySchema,
} from './adminGps.schema';

export const adminGpsRoutes = Router();

adminGpsRoutes.get(
  '/',
  validate({ query: listAdminGpsQuerySchema }),
  asyncHandler(adminGpsController.list),
);

adminGpsRoutes.post(
  '/',
  validate({ body: registerGpsDeviceSchema }),
  asyncHandler(adminGpsController.register),
);

adminGpsRoutes.get(
  '/:id',
  asyncHandler(adminGpsController.getById),
);

adminGpsRoutes.post(
  '/:id/assign',
  validate({ body: assignGpsSchema }),
  asyncHandler(adminGpsController.assign),
);

adminGpsRoutes.post(
  '/:id/unbind',
  validate({ body: unbindGpsSchema }),
  asyncHandler(adminGpsController.unbind),
);

adminGpsRoutes.post(
  '/:id/deactivate',
  validate({ body: deactivateGpsSchema }),
  asyncHandler(adminGpsController.deactivate),
);

adminGpsRoutes.get(
  '/:id/trips',
  asyncHandler(adminGpsController.getTrips),
);

adminGpsRoutes.get(
  '/:id/geofences',
  asyncHandler(adminGpsController.listGeofences),
);

adminGpsRoutes.post(
  '/:id/geofences',
  validate({ body: createGeofenceSchema }),
  asyncHandler(adminGpsController.createGeofence),
);

adminGpsRoutes.delete(
  '/:id/geofences/:geofenceId',
  asyncHandler(adminGpsController.deleteGeofence),
);

adminGpsRoutes.post(
  '/telemetry',
  validate({ body: recordTelemetrySchema }),
  asyncHandler(adminGpsController.recordTelemetry),
);

adminGpsRoutes.get(
  '/:id/history',
  asyncHandler(adminGpsController.getHistory),
);
