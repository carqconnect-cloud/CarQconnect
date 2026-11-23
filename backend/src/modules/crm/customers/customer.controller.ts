import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { customerService } from './customer.service';
import type { CreateCustomerInput, ListCustomersInput, UpdateCustomerInput } from './customer.schema';
import { ApiError } from '../../../common/utils/apiError';

export function orgOf(req: Request): string {
  if (!req.tenant) throw ApiError.forbidden('Organization context required');
  return req.tenant.organizationId;
}

export const customerController = {
  async list(req: Request, res: Response) {
    const orgId = await orgOf(req);
    const { items, meta } = await customerService.list(
      orgId,
      req.query as unknown as ListCustomersInput,
    );
    return ApiResponse.ok(res, items, meta);
  },

  async get(req: Request, res: Response) {
    const orgId = await orgOf(req);
    return ApiResponse.ok(res, await customerService.getById(orgId, req.params.id as string));
  },

  async create(req: Request, res: Response) {
    const orgId = await orgOf(req);
    return ApiResponse.created(
      res,
      await customerService.create(orgId, req.body as CreateCustomerInput),
    );
  },

  async update(req: Request, res: Response) {
    const orgId = await orgOf(req);
    const customer = await customerService.update(
      orgId,
      req.params.id as string,
      req.body as UpdateCustomerInput,
    );
    return ApiResponse.ok(res, customer);
  },

  async remove(req: Request, res: Response) {
    const orgId = orgOf(req);
    await customerService.remove(orgId, req.params.id as string, req.auth?.userId, req.ip);
    return ApiResponse.noContent(res);
  },
};
