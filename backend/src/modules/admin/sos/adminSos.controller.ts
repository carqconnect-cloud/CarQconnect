import type { Request, Response } from 'express';
import { ApiError } from '../../../common/utils/apiError';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminSosService } from './adminSos.service';
import type { ListAdminSosQuery, ResolveSosInput, UpdateSosStatusInput } from './adminSos.schema';

export const adminSosController = {
  async listIncidents(req: Request, res: Response) {
    const query = req.query as unknown as ListAdminSosQuery;
    const result = await adminSosService.listIncidents(query);
    return ApiResponse.ok(res, result.items, { ...result.meta, counts: result.counts });
  },

  async getIncidentById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const incident = await adminSosService.getIncidentById(id);
    return ApiResponse.ok(res, incident);
  },

  async updateStatus(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as UpdateSosStatusInput;
    const adminId = req.auth.userId;
    const incident = await adminSosService.updateStatus(id, adminId, input, req.ip);
    return ApiResponse.ok(res, incident);
  },

  async acknowledge(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const adminId = req.auth.userId;
    const incident = await adminSosService.acknowledgeIncident(id, adminId, req.ip);
    return ApiResponse.ok(res, incident);
  },

  async escalate(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const { notes } = (req.body || {}) as { notes?: string };
    const adminId = req.auth.userId;
    const incident = await adminSosService.escalateIncident(id, adminId, notes, req.ip);
    return ApiResponse.ok(res, incident);
  },

  async resolve(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = (req.body || {}) as ResolveSosInput;
    const adminId = req.auth.userId;
    const incident = await adminSosService.resolveIncident(id, adminId, input.notes, req.ip);
    return ApiResponse.ok(res, incident);
  },

  async notifyContactAgain(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id, contactId } = req.params as { id: string; contactId: string };
    const adminId = req.auth.userId;
    const incident = await adminSosService.notifyContactAgain(id, contactId, adminId, req.ip);
    return ApiResponse.ok(res, incident);
  },
};
