import type { Request, Response } from 'express';
import { ApiError } from '../../../common/utils/apiError';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminOrganizationService } from './adminOrganization.service';
import type {
  ListAdminOrganizationsInput,
  UpdateOrganizationStatusInput,
} from './adminOrganization.schema';

export const adminOrganizationController = {
  async list(req: Request, res: Response) {
    const result = await adminOrganizationService.listOrganizations(
      req.query as unknown as ListAdminOrganizationsInput,
    );
    return ApiResponse.ok(res, result.items, result.meta);
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await adminOrganizationService.getOrganizationById(id);
    return ApiResponse.ok(res, result);
  },

  async updateStatus(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const id = req.params.id as string;
    const result = await adminOrganizationService.updateStatus({
      targetOrgId: id,
      actingAdminId: req.auth.userId,
      input: req.body as UpdateOrganizationStatusInput,
      ipAddress: req.ip,
    });
    return ApiResponse.ok(res, result);
  },
};
