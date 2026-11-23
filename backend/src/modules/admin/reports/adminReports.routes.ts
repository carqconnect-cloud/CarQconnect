import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { adminReportsController } from './adminReports.controller';
import {
  exportReportQuerySchema,
  getReportQuerySchema,
  reportKeyParamSchema,
} from './adminReports.schema';

export const adminReportsRoutes = Router();

// 1. Report summaries & catalog
adminReportsRoutes.get('/', asyncHandler(adminReportsController.getSummary));

// 2. Direct CSV export
adminReportsRoutes.get(
  '/:reportKey/export',
  validate({ params: reportKeyParamSchema, query: exportReportQuerySchema }),
  asyncHandler(adminReportsController.exportCsv),
);

// 3. Paginated report data (or CSV if format=csv query param)
adminReportsRoutes.get(
  '/:reportKey',
  validate({ params: reportKeyParamSchema, query: getReportQuerySchema }),
  asyncHandler(adminReportsController.getReport),
);
