import type { Request, Response } from 'express';
import { remindersService } from './reminders.service';

export const remindersController = {
  getAllReminders: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const reminders = await remindersService.getAllReminders(userId);
    res.json({ success: true, data: reminders });
  },

  getReminderById: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const reminder = await remindersService.getReminderById(userId, req.params.id as string);
    res.json({ success: true, data: reminder });
  },

  createReminder: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const reminder = await remindersService.createReminder(userId, req.body);
    res.status(201).json({ success: true, data: reminder });
  },

  updateReminder: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const reminder = await remindersService.updateReminder(userId, req.params.id as string, req.body);
    res.json({ success: true, data: reminder });
  },

  deleteReminder: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    await remindersService.deleteReminder(userId, req.params.id as string);
    res.json({ success: true, message: 'Reminder deleted' });
  },
};
