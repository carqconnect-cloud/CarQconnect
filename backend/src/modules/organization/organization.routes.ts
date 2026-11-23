import { Role } from '@prisma/client';
import { Router } from 'express';
import { requireMinRole } from '../../common/middleware/authorize.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { organizationController } from './organization.controller';
import { updateOrganizationSchema } from './organization.schema';

export const organizationRouter = Router();

organizationRouter.get('/current', asyncHandler(organizationController.get));
organizationRouter.patch(
  '/current',
  requireMinRole(Role.ADMIN),
  validate({ body: updateOrganizationSchema }),
  asyncHandler(organizationController.update),
);
