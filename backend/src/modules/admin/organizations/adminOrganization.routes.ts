import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { idParamSchema } from '../../../common/validators/common.schema';
import { adminOrganizationController } from './adminOrganization.controller';
import {
  listAdminOrganizationsSchema,
  updateOrganizationStatusSchema,
} from './adminOrganization.schema';

export const adminOrganizationRoutes = Router();

adminOrganizationRoutes.get(
  '/',
  validate({ query: listAdminOrganizationsSchema }),
  asyncHandler(adminOrganizationController.list),
);

adminOrganizationRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminOrganizationController.getById),
);

adminOrganizationRoutes.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateOrganizationStatusSchema }),
  asyncHandler(adminOrganizationController.updateStatus),
);
