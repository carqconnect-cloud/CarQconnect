import type { Request, Response } from 'express';
import { ApiError } from '../../../common/utils/apiError';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminUserService } from './adminUser.service';
import type {
  CreateAdminUserInput,
  ListAdminUsersInput,
  UpdateAdminUserInput,
  UpdateUserStatusInput,
} from './adminUser.schema';

export const adminUserController = {
  async create(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await adminUserService.createUser({
      actingAdminId: req.auth.userId,
      input: req.body as CreateAdminUserInput,
      ipAddress: req.ip,
    });
    return ApiResponse.created(res, result);
  },

  async list(req: Request, res: Response) {
    const result = await adminUserService.listUsers(req.query as unknown as ListAdminUsersInput);
    return ApiResponse.ok(res, result.items, result.meta);
  },

  async stats(_req: Request, res: Response) {
    const stats = await adminUserService.getStats();
    return ApiResponse.ok(res, stats);
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await adminUserService.getUserDetail(id);
    return ApiResponse.ok(res, result);
  },

  async update(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await adminUserService.updateProfile({
      targetUserId: req.params.id as string,
      actingAdminId: req.auth.userId,
      input: req.body as UpdateAdminUserInput,
      ipAddress: req.ip,
    });
    return ApiResponse.ok(res, result);
  },

  async updateStatus(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const id = req.params.id as string;
    const result = await adminUserService.updateStatus({
      targetUserId: id,
      actingAdminId: req.auth.userId,
      input: req.body as UpdateUserStatusInput,
      ipAddress: req.ip,
    });
    return ApiResponse.ok(res, result);
  },

  async remove(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const id = req.params.id as string;
    await adminUserService.deleteCustomer({
      targetUserId: id,
      actingAdminId: req.auth.userId,
      ipAddress: req.ip,
    });
    return ApiResponse.noContent(res);
  },
};
