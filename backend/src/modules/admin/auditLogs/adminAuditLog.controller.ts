import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminAuditLogService } from './adminAuditLog.service';
import type { ListAdminAuditLogsInput } from './adminAuditLog.schema';

export const adminAuditLogController = {
  async list(req: Request, res: Response) {
    const result = await adminAuditLogService.listAuditLogs(
      req.query as unknown as ListAdminAuditLogsInput,
    );
    return ApiResponse.ok(res, result.items, result.meta);
  },

  async exportCsv(req: Request, res: Response) {
    const csv = await adminAuditLogService.exportCsv(
      req.query as unknown as ListAdminAuditLogsInput,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    return res.status(200).send(csv);
  },
};
