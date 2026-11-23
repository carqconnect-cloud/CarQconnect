import { LeadStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema } from '../../../common/validators/common.schema';

export const listLeadsSchema = paginationSchema.extend({
  status: z.nativeEnum(LeadStatus).optional(),
  ownerId: z.string().optional(),
});

export const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  company: z.string().trim().max(120).optional(),
  source: z.string().trim().max(60).optional(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  value: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
  ownerId: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export type ListLeadsInput = z.infer<typeof listLeadsSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
