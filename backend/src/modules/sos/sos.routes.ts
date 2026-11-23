import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middleware/validate.middleware';
import { sosController } from './sos.controller';
import {
  createSosContactSchema,
  sosContactIdParamSchema,
  triggerSosSchema,
  userSosIdParamSchema,
} from './sos.schema';

export const sosRouter = Router();

sosRouter.post(
  '/trigger',
  validate({ body: triggerSosSchema }),
  asyncHandler(sosController.trigger),
);

sosRouter.get(
  '/active',
  asyncHandler(sosController.getActive),
);

sosRouter.post(
  '/:id/cancel',
  validate({ params: userSosIdParamSchema }),
  asyncHandler(sosController.cancel),
);

sosRouter.get(
  '/contacts',
  asyncHandler(sosController.listContacts),
);

sosRouter.post(
  '/contacts',
  validate({ body: createSosContactSchema }),
  asyncHandler(sosController.createContact),
);

sosRouter.delete(
  '/contacts/:contactId',
  validate({ params: sosContactIdParamSchema }),
  asyncHandler(sosController.deleteContact),
);
