import type { Request, Response } from 'express';
import { ApiError } from '../../common/utils/apiError';
import { ApiResponse } from '../../common/utils/apiResponse';
import { organizationService } from './organization.service';
import type { UpdateOrganizationInput } from './organization.schema';

function orgOf(req: Request): string {
  if (!req.tenant) throw ApiError.forbidden('Organization context required');
  return req.tenant.organizationId;
}

export const organizationController = {
  async get(req: Request, res: Response) {
    return ApiResponse.ok(res, await organizationService.get(orgOf(req)));
  },

  async update(req: Request, res: Response) {
    const updated = await organizationService.update(
      orgOf(req),
      req.body as UpdateOrganizationInput,
      req.auth?.userId,
      req.ip,
    );
    return ApiResponse.ok(res, updated);
  },
};
