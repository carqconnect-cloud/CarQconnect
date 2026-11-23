import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminSosController } from './adminSos.controller';
import {
  listAdminSosQuerySchema,
  resolveSosSchema,
  sosContactNotifyParamSchema,
  sosIdParamSchema,
  updateSosStatusSchema,
} from './adminSos.schema';

export const adminSosRoutes = Router();

adminSosRoutes.get(
  '/',
  validate({ query: listAdminSosQuerySchema }),
  asyncHandler(adminSosController.listIncidents),
);

adminSosRoutes.get(
  '/:id',
  validate({ params: sosIdParamSchema }),
  asyncHandler(adminSosController.getIncidentById),
);

adminSosRoutes.patch(
  '/:id/status',
  validate({ params: sosIdParamSchema, body: updateSosStatusSchema }),
  asyncHandler(adminSosController.updateStatus),
);

adminSosRoutes.post(
  '/:id/acknowledge',
  validate({ params: sosIdParamSchema }),
  asyncHandler(adminSosController.acknowledge),
);

adminSosRoutes.post(
  '/:id/escalate',
  validate({ params: sosIdParamSchema }),
  asyncHandler(adminSosController.escalate),
);

adminSosRoutes.post(
  '/:id/resolve',
  validate({ params: sosIdParamSchema, body: resolveSosSchema }),
  asyncHandler(adminSosController.resolve),
);

adminSosRoutes.post(
  '/:id/contacts/:contactId/notify-again',
  validate({ params: sosContactNotifyParamSchema }),
  asyncHandler(adminSosController.notifyContactAgain),
);
