import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middleware/validate.middleware';
import { vehicleController } from './vehicle.controller';
import { createVehicleSchema, updateVehicleSchema } from './vehicle.schema';
import { customerLinkQrSchema } from '../admin/qr/adminQr.schema';

export const vehicleRouter = Router();

vehicleRouter.get('/', asyncHandler(vehicleController.list));
vehicleRouter.post('/', validate({ body: createVehicleSchema }), asyncHandler(vehicleController.create));
vehicleRouter.get('/:id', asyncHandler(vehicleController.getById));
vehicleRouter.patch('/:id', validate({ body: updateVehicleSchema }), asyncHandler(vehicleController.update));
vehicleRouter.delete('/:id', asyncHandler(vehicleController.delete));
vehicleRouter.post('/:id/qr', validate({ body: customerLinkQrSchema }), asyncHandler(vehicleController.linkQr));
vehicleRouter.delete('/:id/qr', asyncHandler(vehicleController.unlinkQr));
