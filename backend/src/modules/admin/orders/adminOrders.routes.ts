import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminOrdersController } from './adminOrders.controller';
import {
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} from './adminOrders.schema';

export const adminOrdersRoutes = Router();

adminOrdersRoutes.get(
  '/',
  validate({ query: listOrdersQuerySchema }),
  asyncHandler(adminOrdersController.listOrders),
);

adminOrdersRoutes.get(
  '/stats',
  asyncHandler(adminOrdersController.getOrderStats),
);

adminOrdersRoutes.get(
  '/:id',
  asyncHandler(adminOrdersController.getOrderById),
);

adminOrdersRoutes.patch(
  '/:id/status',
  validate({ body: updateOrderStatusSchema }),
  asyncHandler(adminOrdersController.updateOrderStatus),
);

adminOrdersRoutes.put(
  '/:id/status',
  validate({ body: updateOrderStatusSchema }),
  asyncHandler(adminOrdersController.updateOrderStatus),
);

adminOrdersRoutes.post(
  '/:id/refund',
  asyncHandler(adminOrdersController.processRefund),
);

adminOrdersRoutes.post(
  '/:id/notes',
  asyncHandler(adminOrdersController.addOrderNote),
);

adminOrdersRoutes.post(
  '/:id/shiprocket',
  asyncHandler(adminOrdersController.shipViaShiprocket),
);

adminOrdersRoutes.get(
  '/:id/shipping-label',
  asyncHandler(adminOrdersController.getShippingLabel),
);
