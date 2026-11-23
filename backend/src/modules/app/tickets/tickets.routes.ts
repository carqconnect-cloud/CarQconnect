import { Router } from 'express';
import { ticketsController } from './tickets.controller';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const ticketsRouter = Router();

// Raise a ticket (open with or without JWT token)
ticketsRouter.post('/', asyncHandler(ticketsController.raiseTicket));
ticketsRouter.post('/raise', asyncHandler(ticketsController.raiseTicket));

// Get my tickets
ticketsRouter.get('/', asyncHandler(ticketsController.getMyTickets));
ticketsRouter.get('/my', asyncHandler(ticketsController.getMyTickets));
