import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { idParamSchema } from '../../../common/validators/common.schema';
import { adminUserController } from './adminUser.controller';
import {
  createAdminUserSchema,
  listAdminUsersSchema,
  updateAdminUserSchema,
  updateUserStatusSchema,
} from './adminUser.schema';

export const adminUserRoutes = Router();

adminUserRoutes.get(
  '/stats',
  asyncHandler(adminUserController.stats),
);

adminUserRoutes.get(
  '/',
  validate({ query: listAdminUsersSchema }),
  asyncHandler(adminUserController.list),
);

adminUserRoutes.post(
  '/',
  validate({ body: createAdminUserSchema }),
  asyncHandler(adminUserController.create),
);

adminUserRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminUserController.getById),
);

adminUserRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateAdminUserSchema }),
  asyncHandler(adminUserController.update),
);

adminUserRoutes.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateUserStatusSchema }),
  asyncHandler(adminUserController.updateStatus),
);

adminUserRoutes.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminUserController.remove),
);
