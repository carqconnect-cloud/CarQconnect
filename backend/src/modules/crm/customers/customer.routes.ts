
import { Router } from 'express';

import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { idParamSchema } from '../../../common/validators/common.schema';
import { customerController } from './customer.controller';
import { createCustomerSchema, listCustomersSchema, updateCustomerSchema } from './customer.schema';

export const customerRouter = Router();

customerRouter.get('/', validate({ query: listCustomersSchema }), asyncHandler(customerController.list));
customerRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(customerController.get));

customerRouter.post(
  '/',
  validate({ body: createCustomerSchema }),
  asyncHandler(customerController.create),
);
customerRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  asyncHandler(customerController.update),
);
customerRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(customerController.remove),
);
