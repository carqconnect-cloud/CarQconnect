import { z } from 'zod';

export const createReminderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  type: z.string().optional().default('general'),
  date: z.string().datetime(), // ISO 8601 string
  time: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const updateReminderSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional().nullable(),
  type: z.string().optional(),
  date: z.string().datetime().optional(),
  time: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
