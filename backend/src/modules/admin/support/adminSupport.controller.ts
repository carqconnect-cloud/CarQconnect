import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminSupportService } from './adminSupport.service';
import type {
  AssignTicketInput,
  CreateTicketMessageInput,
  ListTicketsQueryInput,
  UpdateTicketStatusInput,
} from './adminSupport.schema';

export const adminSupportController = {
  async listTickets(req: Request, res: Response) {
    const query = req.query as unknown as ListTicketsQueryInput;
    const result = await adminSupportService.listTickets(query);
    return ApiResponse.ok(res, result.items, result.pagination);
  },

  async getTicketById(req: Request, res: Response) {
    const id = req.params.id as string;
    const ticket = await adminSupportService.getTicketById(id);
    return ApiResponse.ok(res, ticket);
  },

  async updateStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateTicketStatusInput;
    const actorId = req.auth?.userId;
    const actorEmail = req.auth?.email;

    const updated = await adminSupportService.updateStatus(id, body, actorId, actorEmail);
    return ApiResponse.ok(res, updated);
  },

  async assignTicket(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as AssignTicketInput;
    const actorId = req.auth?.userId;
    const actorEmail = req.auth?.email;

    const updated = await adminSupportService.assignTicket(id, body, actorId, actorEmail);
    return ApiResponse.ok(res, updated);
  },

  async addMessage(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as CreateTicketMessageInput;
    const actorId = req.auth?.userId;

    const message = await adminSupportService.addMessage(id, body, actorId);
    return ApiResponse.created(res, message);
  },

  async listAiEscalations(req: Request, res: Response) {
    const query = req.query as unknown as ListTicketsQueryInput;
    const result = await adminSupportService.listAiEscalations(query);
    return ApiResponse.ok(res, result.items, result.pagination);
  },

  async getAnalytics(_req: Request, res: Response) {
    const analytics = await adminSupportService.getAnalytics();
    return ApiResponse.ok(res, analytics);
  },
};
