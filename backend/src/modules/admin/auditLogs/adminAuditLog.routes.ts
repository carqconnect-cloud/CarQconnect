import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { adminAuditLogController } from './adminAuditLog.controller';
import { listAdminAuditLogsSchema } from './adminAuditLog.schema';

export const adminAuditLogRoutes = Router();

adminAuditLogRoutes.get(
  '/export',
  asyncHandler(adminAuditLogController.exportCsv),
);

adminAuditLogRoutes.get(
  '/',
  validate({ query: listAdminAuditLogsSchema }),
  asyncHandler(adminAuditLogController.list),
);
