import { z } from 'zod';

export const storeOrderStatusEnum = z.enum([
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export type StoreOrderStatusType = z.infer<typeof storeOrderStatusEnum>;

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().trim().optional(),
  status: z
    .string()
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => ['ALL', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(val), {
      message: 'Invalid status filter',
    })
    .optional(),
  userId: z.string().trim().optional(),
});

export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: storeOrderStatusEnum,
  note: z.string().trim().max(500).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
