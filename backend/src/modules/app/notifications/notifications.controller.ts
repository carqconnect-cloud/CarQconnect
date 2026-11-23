import type { Request, Response } from 'express';
import { notificationsService } from './notifications.service';

export const notificationsController = {
  getAllNotifications: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const notifications = await notificationsService.getAllNotifications(userId);
    res.json({ success: true, data: notifications });
  },

  getNotificationById: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const notification = await notificationsService.getNotificationById(userId, req.params.id as string);
    res.json({ success: true, data: notification });
  },

  createNotification: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const notification = await notificationsService.createNotification(userId, req.body);
    res.status(201).json({ success: true, data: notification });
  },

  updateNotification: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const notification = await notificationsService.updateNotification(userId, req.params.id as string, req.body);
    res.json({ success: true, data: notification });
  },

  markAllAsRead: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    await notificationsService.markAllAsRead(userId);
    res.json({ success: true, message: 'Marked all as read' });
  },

  deleteNotification: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    await notificationsService.deleteNotification(userId, req.params.id as string);
    res.json({ success: true, message: 'Notification deleted' });
  },
};
