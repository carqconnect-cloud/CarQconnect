import { z } from 'zod';

export const planFeatureSchema = z.object({
  title: z.string().trim().min(1, 'Feature title is required'),
  isIncluded: z.boolean().default(true),
});

export const createPlanSchema = z.object({
  name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(100),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  badge: z.string().trim().max(50).nullable().optional(),
  description: z.string().trim().default(''),
  features: z
    .union([
      z.array(planFeatureSchema),
      z.array(z.string().trim()).transform((arr) =>
        arr.map((f) => ({
          title: f.replace(/^[-x]\s*/i, '').trim(),
          isIncluded: !/^[-x]\s*/i.test(f),
        })),
      ),
    ])
    .default([]),
});

export const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  price: z.coerce.number().min(0).optional(),
  badge: z.string().trim().max(50).nullable().optional(),
  description: z.string().trim().optional(),
  features: z
    .union([
      z.array(planFeatureSchema),
      z.array(z.string().trim()).transform((arr) =>
        arr.map((f) => ({
          title: f.replace(/^[-x]\s*/i, '').trim(),
          isIncluded: !/^[-x]\s*/i.test(f),
        })),
      ),
    ])
    .optional(),
});

export const listSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  planId: z.string().trim().optional(),
});

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED']),
});

export const renewalsQuerySchema = z.object({
  days: z.coerce.number().int().positive().default(30),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ListSubscriptionsQueryInput = z.infer<typeof listSubscriptionsQuerySchema>;
export type UpdateSubscriptionStatusInput = z.infer<typeof updateSubscriptionStatusSchema>;
export type RenewalsQueryInput = z.infer<typeof renewalsQuerySchema>;
