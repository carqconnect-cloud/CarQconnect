import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { adminCrmController } from './adminCrm.controller';
import {
  listAdminCrmCallsSchema,
  listAdminCrmLeadsSchema,
} from './adminCrm.schema';

export const adminCrmRoutes = Router();

adminCrmRoutes.get(
  '/overview',
  asyncHandler(adminCrmController.getOverview),
);

adminCrmRoutes.get(
  '/calls',
  validate({ query: listAdminCrmCallsSchema }),
  asyncHandler(adminCrmController.listCalls),
);

adminCrmRoutes.get(
  '/leads',
  validate({ query: listAdminCrmLeadsSchema }),
  asyncHandler(adminCrmController.listLeads),
);
