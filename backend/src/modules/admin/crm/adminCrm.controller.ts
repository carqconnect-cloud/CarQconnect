import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminCrmService } from './adminCrm.service';
import type {
  ListAdminCrmCallsInput,
  ListAdminCrmLeadsInput,
} from './adminCrm.schema';

export const adminCrmController = {
  async getOverview(_req: Request, res: Response) {
    const data = await adminCrmService.getOverview();
    return ApiResponse.ok(res, data);
  },

  async listCalls(req: Request, res: Response) {
    const data = await adminCrmService.listCalls(
      req.query as unknown as ListAdminCrmCallsInput,
    );
    return ApiResponse.ok(res, data.items, data.meta);
  },

  async listLeads(req: Request, res: Response) {
    const data = await adminCrmService.listLeads(
      req.query as unknown as ListAdminCrmLeadsInput,
    );
    return ApiResponse.ok(res, data.items, data.meta);
  },
};
