import { Request, Response } from 'express';
import { crmTicketService } from './ticket.service';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { ApiError } from '../../../common/utils/apiError';

export const crmTicketController = {
  async listTickets(req: Request, res: Response) {
    const orgId = (req as any).auth?.organizationId;
    const { status, priority, search, id, ticketId } = req.query as {
      status?: string;
      priority?: string;
      search?: string;
      id?: string;
      ticketId?: string;
    };

    if (id || ticketId) {
      const ticket = await crmTicketService.getTicketById((id || ticketId)!);
      if (!ticket) throw ApiError.notFound('Ticket not found');
      return ApiResponse.ok(res, ticket);
    }

    const tickets = await crmTicketService.listTickets(orgId, { status, priority, search });
    return ApiResponse.ok(res, tickets);
  },

  async getAssignees(req: Request, res: Response) {
    const orgId = (req as any).auth?.organizationId;
    const assignees = await crmTicketService.getAssignees(orgId);
    return ApiResponse.ok(res, assignees);
  },

  async getTicket(req: Request, res: Response) {
    const id = (req.params.id || req.query.id || req.query.ticketId) as string;
    if (!id) throw ApiError.badRequest('Ticket ID is required');
    const ticket = await crmTicketService.getTicketById(id);
    if (!ticket) throw ApiError.notFound('Ticket not found');
    return ApiResponse.ok(res, ticket);
  },

  async updateTicket(req: Request, res: Response) {
    const {
      status,
      priority,
      assignedToId,
      assignedToName,
      assignedToRole,
      assignedById,
      assignedByName,
      assignedByRole,
      id,
      ticketId,
    } = (req.body || {});
    const targetId = (req.params.id || ticketId || id || req.query.ticketId || req.query.id) as string;
    if (!targetId) {
      throw ApiError.badRequest('Ticket ID is required');
    }
    const ticket = await crmTicketService.updateTicket(targetId, {
      status,
      priority,
      assignedToId,
      assignedToName,
      assignedToRole,
      assignedById,
      assignedByName,
      assignedByRole,
    });
    return ApiResponse.ok(res, ticket);
  },
};
