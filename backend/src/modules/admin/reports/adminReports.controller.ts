import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminReportsService } from './adminReports.service';
import type {
  ExportReportQueryInput,
  GetReportQueryInput,
  SupportedReportKey,
} from './adminReports.schema';

export const adminReportsController = {
  /**
   * GET /api/v1/admin/reports
   * Returns list of available operational reports with live row counts.
   */
  async getSummary(_req: Request, res: Response) {
    const summary = await adminReportsService.getReportsSummary();
    return ApiResponse.ok(res, summary);
  },

  /**
   * GET /api/v1/admin/reports/:reportKey
   * Retrieves paginated data rows for a specified report, or CSV if format=csv.
   */
  async getReport(req: Request, res: Response) {
    const reportKey = req.params.reportKey as SupportedReportKey;
    const query = req.query as unknown as GetReportQueryInput;
    const actorId = req.auth?.userId;

    if (query.format === 'csv') {
      const { filename, csvContent } = await adminReportsService.exportReportCsv(
        reportKey,
        query,
        actorId,
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      return res.status(200).send(csvContent);
    }

    const data = await adminReportsService.getReportData(reportKey, query);
    return ApiResponse.ok(res, data.rows, {
      pagination: data.pagination,
      reportKey: data.reportKey,
      label: data.label,
      headers: data.headers,
    });
  },

  /**
   * GET /api/v1/admin/reports/:reportKey/export
   * Direct CSV export endpoint returning RFC 4180 formatted CSV with audit event.
   */
  async exportCsv(req: Request, res: Response) {
    const reportKey = req.params.reportKey as SupportedReportKey;
    const query = req.query as unknown as ExportReportQueryInput;
    const actorId = req.auth?.userId;

    const { filename, csvContent } = await adminReportsService.exportReportCsv(
      reportKey,
      query,
      actorId,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).send(csvContent);
  },
};
