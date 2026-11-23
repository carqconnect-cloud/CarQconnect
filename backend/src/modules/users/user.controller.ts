import type { Request, Response } from 'express';
import { ApiError } from '../../common/utils/apiError';
import { ApiResponse } from '../../common/utils/apiResponse';
import { userService } from './user.service';
import type {
  InviteUserInput,
  ListUsersInput,
  UpdateMemberInput,
  UpdateProfileInput,
} from './user.schema';

function contextOf(req: Request) {
  if (!req.auth || !req.tenant) throw ApiError.unauthorized();
  return { userId: req.auth.userId, organizationId: req.tenant.organizationId, role: req.tenant.role };
}

export const userController = {
  async list(req: Request, res: Response) {
    const { organizationId } = contextOf(req);
    const { items, meta } = await userService.listMembers(
      organizationId,
      req.query as unknown as ListUsersInput,
    );
    return ApiResponse.ok(res, items, meta);
  },

  async get(req: Request, res: Response) {
    const { organizationId } = contextOf(req);
    const member = await userService.getMember(organizationId, req.params.id as string);
    return ApiResponse.ok(res, member);
  },

  async invite(req: Request, res: Response) {
    const { organizationId, userId, role } = contextOf(req);
    const member = await userService.invite(
      organizationId,
      userId,
      req.body as InviteUserInput,
      req.ip,
      role,
    );
    return ApiResponse.created(res, member);
  },

  async update(req: Request, res: Response) {
    const { organizationId, userId } = contextOf(req);
    const member = await userService.updateMember(
      organizationId,
      req.params.id as string,
      req.body as UpdateMemberInput,
      userId,
      req.ip,
    );
    return ApiResponse.ok(res, member);
  },

  async remove(req: Request, res: Response) {
    const { organizationId, userId } = contextOf(req);
    await userService.removeMember(organizationId, req.params.id as string, userId, req.ip);
    return ApiResponse.noContent(res);
  },

  async updateProfile(req: Request, res: Response) {
    const { userId } = contextOf(req);
    const user = await userService.updateProfile(userId, req.body as UpdateProfileInput);
    return ApiResponse.ok(res, user);
  },
};
