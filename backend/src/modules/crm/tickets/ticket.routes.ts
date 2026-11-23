import { Router } from 'express';
import { crmTicketController } from './ticket.controller';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const ticketRouter = Router();

ticketRouter.get('/meta/assignees', asyncHandler(crmTicketController.getAssignees));
ticketRouter.get('/', asyncHandler(crmTicketController.listTickets));
ticketRouter.patch('/', asyncHandler(crmTicketController.updateTicket));
ticketRouter.put('/', asyncHandler(crmTicketController.updateTicket));
ticketRouter.post('/', asyncHandler(crmTicketController.updateTicket));
ticketRouter.get('/:id', asyncHandler(crmTicketController.getTicket));
ticketRouter.patch('/:id', asyncHandler(crmTicketController.updateTicket));
ticketRouter.put('/:id', asyncHandler(crmTicketController.updateTicket));
ticketRouter.post('/:id', asyncHandler(crmTicketController.updateTicket));

ticketRouter.all('*', (req, res) => {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found in tickets API`,
    },
  });
});
