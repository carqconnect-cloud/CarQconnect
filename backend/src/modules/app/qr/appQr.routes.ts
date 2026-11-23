import { Router } from 'express';
import { appQrController } from './appQr.controller';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const appQrRouter = Router();

appQrRouter.get('/vehicles', asyncHandler(appQrController.getVehicles));
appQrRouter.post('/vehicles', asyncHandler(appQrController.addVehicle));
appQrRouter.get('/vehicle-image', asyncHandler(appQrController.getVehicleImage));
appQrRouter.get('/vehicle-lookup', asyncHandler(appQrController.lookupVehicle));

appQrRouter.get('/tags', asyncHandler(appQrController.getQrTags));
appQrRouter.post('/tags/link', asyncHandler(appQrController.linkQrTag));
appQrRouter.patch('/tags/:tagId/privacy', asyncHandler(appQrController.updateQrPrivacy));
