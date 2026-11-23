import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/utils/apiResponse';
import { teamService } from './team.service';
import type { CreateTeamInput, ListTeamsInput, UpdateTeamInput } from './team.schema';
import { ApiError } from '../../../common/utils/apiError';

export function orgOf(req: Request): string {
  if (!req.tenant) throw ApiError.forbidden('Organization context required');
  return req.tenant.organizationId;
}

export const teamController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await teamService.list(
      await orgOf(req),
      req.query as unknown as ListTeamsInput,
    );
    return ApiResponse.ok(res, items, meta);
  },

  async get(req: Request, res: Response) {
    return ApiResponse.ok(res, await teamService.getById(await orgOf(req), req.params.id as string));
  },

  async create(req: Request, res: Response) {
    return ApiResponse.created(
      res,
      await teamService.create(await orgOf(req), req.body as CreateTeamInput),
    );
  },

  async update(req: Request, res: Response) {
    const team = await teamService.update(
      await orgOf(req),
      req.params.id as string,
      req.body as UpdateTeamInput,
    );
    return ApiResponse.ok(res, team);
  },

  async remove(req: Request, res: Response) {
    const orgId = orgOf(req);
    await teamService.remove(orgId, req.params.id as string, req.auth?.userId, req.ip);
    return ApiResponse.noContent(res);
  },

  async metrics(req: Request, res: Response) {
    const metrics = await teamService.getMetrics(
      await orgOf(req),
      req.params.id as string,
      req.query.timeframe as string
    );
    return ApiResponse.ok(res, metrics);
  }
};
