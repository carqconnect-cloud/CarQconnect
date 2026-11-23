import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { notificationsController } from './notifications.controller';
import { createNotificationSchema, updateNotificationSchema } from './notifications.schema';

export const notificationRouter = Router();

notificationRouter.get('/', asyncHandler(notificationsController.getAllNotifications));

notificationRouter.post(
  '/',
  validate({ body: createNotificationSchema }),
  asyncHandler(notificationsController.createNotification)
);

notificationRouter.post(
  '/mark-read',
  asyncHandler(notificationsController.markAllAsRead)
);

notificationRouter.get('/:id', asyncHandler(notificationsController.getNotificationById));

notificationRouter.patch(
  '/:id',
  validate({ body: updateNotificationSchema }),
  asyncHandler(notificationsController.updateNotification)
);

notificationRouter.delete('/:id', asyncHandler(notificationsController.deleteNotification));
