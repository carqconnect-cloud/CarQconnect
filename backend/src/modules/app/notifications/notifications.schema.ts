import { z } from 'zod';

export const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.string().optional().default('general'),
  isUnread: z.boolean().optional().default(true),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const updateNotificationSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  isUnread: z.boolean().optional(),
});

export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
