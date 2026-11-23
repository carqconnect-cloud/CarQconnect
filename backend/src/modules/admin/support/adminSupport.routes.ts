import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminSupportController } from './adminSupport.controller';
import {
  assignTicketSchema,
  createTicketMessageSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updateTicketStatusSchema,
} from './adminSupport.schema';

export const adminSupportRoutes = Router();

// 1. Support Analytics
adminSupportRoutes.get('/analytics', asyncHandler(adminSupportController.getAnalytics));

// 2. AI Escalation Queue
adminSupportRoutes.get(
  '/ai-escalations',
  validate({ query: listTicketsQuerySchema }),
  asyncHandler(adminSupportController.listAiEscalations),
);

// 3. Ticket List & Triage
adminSupportRoutes.get(
  '/tickets',
  validate({ query: listTicketsQuerySchema }),
  asyncHandler(adminSupportController.listTickets),
);

// 4. Ticket Detail
adminSupportRoutes.get(
  '/tickets/:id',
  validate({ params: ticketIdParamSchema }),
  asyncHandler(adminSupportController.getTicketById),
);

// 5. Ticket Status Transition (including Reopening)
adminSupportRoutes.patch(
  '/tickets/:id/status',
  validate({ params: ticketIdParamSchema, body: updateTicketStatusSchema }),
  asyncHandler(adminSupportController.updateStatus),
);

// 6. Ticket Staff Assignment / Unassignment
adminSupportRoutes.post(
  '/tickets/:id/assign',
  validate({ params: ticketIdParamSchema, body: assignTicketSchema }),
  asyncHandler(adminSupportController.assignTicket),
);

// 7. Timeline Messages
adminSupportRoutes.post(
  '/tickets/:id/messages',
  validate({ params: ticketIdParamSchema, body: createTicketMessageSchema }),
  asyncHandler(adminSupportController.addMessage),
);
