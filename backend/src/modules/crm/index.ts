import { Router } from 'express';
import { leadRouter } from './leads/lead.routes';
import { customerRouter } from './customers/customer.routes';

import { teamRouter } from './teams/team.routes';
import { dashboardRouter } from './dashboard/dashboard.routes';
import { ticketRouter } from './tickets/ticket.routes';

export const crmRouter = Router();

crmRouter.use('/leads', leadRouter);
crmRouter.use('/customers', customerRouter);
crmRouter.use('/tickets', ticketRouter);
crmRouter.use('/teams', teamRouter);
crmRouter.use('/dashboard', dashboardRouter);
// crmRouter.use('/pipeline', pipelineRouter);
