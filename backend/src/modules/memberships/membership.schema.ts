import { z } from 'zod';

export const createCheckoutSchema = z.object({
  planId: z.string().trim().optional(),
  planSlug: z.string().trim().optional(),
}).refine((data) => data.planId || data.planSlug, {
  message: 'Either planId or planSlug must be provided',
  path: ['planId'],
});

export const subscribeSchema = z.object({
  planId: z.string().trim().optional(),
  planSlug: z.string().trim().optional(),
  razorpayPaymentId: z.string({ required_error: 'Valid Razorpay payment ID is required' }).trim().min(5, 'Valid Razorpay payment ID is required'),
  razorpayOrderId: z.string({ required_error: 'Valid Razorpay order ID is required' }).trim().min(5, 'Valid Razorpay order ID is required'),
  razorpaySignature: z.string({ required_error: 'Valid Razorpay payment signature is required' }).trim().min(5, 'Valid Razorpay payment signature is required'),
  autoRenew: z.boolean().default(false),
}).refine((data) => data.planId || data.planSlug, {
  message: 'Either planId or planSlug must be provided',
  path: ['planId'],
});

export const updatePreferencesSchema = z.object({
  autoRenew: z.boolean({ required_error: 'autoRenew boolean is required' }),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
