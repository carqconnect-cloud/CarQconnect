import { z } from 'zod';

export const triggerSosSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  vehicleReg: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type TriggerSosInput = z.infer<typeof triggerSosSchema>;

export const createSosContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .trim()
    .min(10, 'Valid phone number is required')
    .max(15)
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format'),
  relationship: z.string().trim().max(50).optional(),
  isPrimary: z.boolean().default(false),
});

export type CreateSosContactInput = z.infer<typeof createSosContactSchema>;

export const sosContactIdParamSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
});

export const userSosIdParamSchema = z.object({
  id: z.string().min(1, 'Incident ID is required'),
});
