import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminRoleService } from './adminRole.service';
import type {
  RoleIdParamInput,
  UpdateRolePermissionsInput,
} from './adminRole.schema';

export const adminRoleController = {
  async getRoles(_req: Request, res: Response) {
    const data = await adminRoleService.getRoles();
    return ApiResponse.ok(res, data.roles, { total: data.total });
  },

  async updatePermissions(req: Request, res: Response) {
    const { id } = req.params as unknown as RoleIdParamInput;
    const input = req.body as UpdateRolePermissionsInput;
    const actorId = req.auth?.userId;
    const ipAddress = req.ip;

    const updated = await adminRoleService.updatePermissions(
      id,
      input,
      actorId,
      ipAddress,
    );
    return ApiResponse.ok(res, updated);
  },
};
