import type { Request, Response } from 'express';
import { ApiError } from '../../common/utils/apiError';
import { ApiResponse } from '../../common/utils/apiResponse';
import { sosService } from './sos.service';
import type { CreateSosContactInput, TriggerSosInput } from './sos.schema';

export const sosController = {
  async trigger(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const input = req.body as TriggerSosInput;
    const userId = req.auth.userId;
    const result = await sosService.triggerSos(userId, input, req.ip);
    const statusCode = result.alreadyActive ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      data: result,
    });
  },

  async getActive(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const userId = req.auth.userId;
    const active = await sosService.getActiveSos(userId);
    return ApiResponse.ok(res, active);
  },

  async cancel(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const userId = req.auth.userId;
    const cancelled = await sosService.cancelSos(id, userId, req.ip);
    return ApiResponse.ok(res, cancelled);
  },

  async listContacts(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const userId = req.auth.userId;
    const contacts = await sosService.listContacts(userId);
    return ApiResponse.ok(res, contacts);
  },

  async createContact(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const input = req.body as CreateSosContactInput;
    const userId = req.auth.userId;
    const contact = await sosService.createContact(userId, input);
    return ApiResponse.created(res, contact);
  },

  async deleteContact(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { contactId } = req.params as { contactId: string };
    const userId = req.auth.userId;
    await sosService.deleteContact(contactId, userId);
    return ApiResponse.noContent(res);
  },
};
