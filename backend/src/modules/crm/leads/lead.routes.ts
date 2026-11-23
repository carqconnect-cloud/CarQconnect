import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireMinRole } from '../../../common/middleware/authorize.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { idParamSchema } from '../../../common/validators/common.schema';
import { leadController } from './lead.controller';
import { createLeadSchema, listLeadsSchema, updateLeadSchema } from './lead.schema';

export const leadRouter = Router();

leadRouter.get('/', validate({ query: listLeadsSchema }), asyncHandler(leadController.list));
leadRouter.get('/stats', asyncHandler(leadController.stats));
leadRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(leadController.get));

leadRouter.post(
  '/',
  requireMinRole(Role.EXECUTIVE),
  validate({ body: createLeadSchema }),
  asyncHandler(leadController.create),
);
leadRouter.patch(
  '/:id',
  requireMinRole(Role.EXECUTIVE),
  validate({ params: idParamSchema, body: updateLeadSchema }),
  asyncHandler(leadController.update),
);
leadRouter.delete(
  '/:id',
  requireMinRole(Role.TEAM_HEAD),
  validate({ params: idParamSchema }),
  asyncHandler(leadController.remove),
);
