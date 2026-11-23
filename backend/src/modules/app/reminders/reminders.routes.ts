import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { remindersController } from './reminders.controller';
import { createReminderSchema, updateReminderSchema } from './reminders.schema';

export const reminderRouter = Router();

reminderRouter.get('/', asyncHandler(remindersController.getAllReminders));

reminderRouter.post(
  '/',
  validate({ body: createReminderSchema }),
  asyncHandler(remindersController.createReminder)
);

reminderRouter.get('/:id', asyncHandler(remindersController.getReminderById));

reminderRouter.patch(
  '/:id',
  validate({ body: updateReminderSchema }),
  asyncHandler(remindersController.updateReminder)
);

reminderRouter.delete('/:id', asyncHandler(remindersController.deleteReminder));
