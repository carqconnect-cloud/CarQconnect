import type { Request, Response } from 'express';
import { ApiError } from '../../../common/utils/apiError';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminQrService } from './adminQr.service';
import {
  AssignQrInput,
  BatchGenerateQrInput,
  DeactivateQrInput,
  ListAdminQrQuery,
  ListQrScansQuery,
  ReactivateQrInput,
  ReplaceQrInput,
  SuspendQrInput,
} from './adminQr.schema';

export const adminQrController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ListAdminQrQuery;
    const result = await adminQrService.listQrCodes(query);
    return ApiResponse.ok(res, result.items, {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPreviousPage: result.page > 1,
      },
    });
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminQrService.getQrById(id);
    return ApiResponse.ok(res, result);
  },

  async batchGenerate(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const input = req.body as BatchGenerateQrInput;
    const actorId = req.auth.userId;
    const result = await adminQrService.batchGenerate(input, actorId, req.ip);
    return ApiResponse.created(res, result);
  },

  async assign(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as AssignQrInput;
    const actorId = req.auth.userId;
    const result = await adminQrService.assignQr(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async replace(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as ReplaceQrInput;
    const actorId = req.auth.userId;
    const result = await adminQrService.replaceQr(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async suspend(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as SuspendQrInput;
    const actorId = req.auth.userId;
    const result = await adminQrService.suspendQr(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async reactivate(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as ReactivateQrInput;
    const actorId = req.auth.userId;
    const result = await adminQrService.reactivateQr(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async deactivate(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as DeactivateQrInput;
    const actorId = req.auth.userId;
    const result = await adminQrService.deactivateQr(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async scans(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const query = req.query as unknown as ListQrScansQuery;
    const result = await adminQrService.listScanLogs(id, query.page, query.limit);
    return ApiResponse.ok(res, result.items, {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPreviousPage: result.page > 1,
      },
    });
  },
};
