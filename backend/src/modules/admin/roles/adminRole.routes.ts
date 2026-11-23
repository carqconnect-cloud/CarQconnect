import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { adminRoleController } from './adminRole.controller';
import {
  roleIdParamSchema,
  updateRolePermissionsSchema,
} from './adminRole.schema';

export const adminRoleRoutes = Router();

adminRoleRoutes.get(
  '/',
  asyncHandler(adminRoleController.getRoles),
);

adminRoleRoutes.patch(
  '/:id',
  validate({ params: roleIdParamSchema, body: updateRolePermissionsSchema }),
  asyncHandler(adminRoleController.updatePermissions),
);
