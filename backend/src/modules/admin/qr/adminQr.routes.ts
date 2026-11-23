import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminQrController } from './adminQr.controller';
import {
  assignQrSchema,
  batchGenerateQrSchema,
  deactivateQrSchema,
  listAdminQrQuerySchema,
  listQrScansQuerySchema,
  reactivateQrSchema,
  replaceQrSchema,
  suspendQrSchema,
} from './adminQr.schema';

export const adminQrRoutes = Router();

adminQrRoutes.get(
  '/',
  validate({ query: listAdminQrQuerySchema }),
  asyncHandler(adminQrController.list),
);

adminQrRoutes.post(
  '/batch',
  validate({ body: batchGenerateQrSchema }),
  asyncHandler(adminQrController.batchGenerate),
);

adminQrRoutes.get(
  '/:id',
  asyncHandler(adminQrController.getById),
);

adminQrRoutes.post(
  '/:id/assign',
  validate({ body: assignQrSchema }),
  asyncHandler(adminQrController.assign),
);

adminQrRoutes.post(
  '/:id/replace',
  validate({ body: replaceQrSchema }),
  asyncHandler(adminQrController.replace),
);

adminQrRoutes.post(
  '/:id/suspend',
  validate({ body: suspendQrSchema }),
  asyncHandler(adminQrController.suspend),
);

adminQrRoutes.post(
  '/:id/reactivate',
  validate({ body: reactivateQrSchema }),
  asyncHandler(adminQrController.reactivate),
);

adminQrRoutes.post(
  '/:id/deactivate',
  validate({ body: deactivateQrSchema }),
  asyncHandler(adminQrController.deactivate),
);

adminQrRoutes.get(
  '/:id/scans',
  validate({ query: listQrScansQuerySchema }),
  asyncHandler(adminQrController.scans),
);
