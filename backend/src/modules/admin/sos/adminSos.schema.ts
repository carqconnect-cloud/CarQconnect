import { z } from 'zod';
import { SosEventStatus } from '@prisma/client';

export const listAdminSosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tab: z.enum(['active', 'history']).optional(),
  status: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase() : val),
      z.nativeEnum(SosEventStatus),
    )
    .optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['createdAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAdminSosQuery = z.infer<typeof listAdminSosQuerySchema>;

export const sosIdParamSchema = z.object({
  id: z.string().min(1, 'Incident ID is required'),
});

export const sosContactNotifyParamSchema = z.object({
  id: z.string().min(1, 'Incident ID is required'),
  contactId: z.string().min(1, 'Contact ID is required'),
});

export const updateSosStatusSchema = z.object({
  status: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.nativeEnum(SosEventStatus),
  ),
  notes: z.string().trim().max(1000).optional(),
});

export type UpdateSosStatusInput = z.infer<typeof updateSosStatusSchema>;

export const resolveSosSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

export type ResolveSosInput = z.infer<typeof resolveSosSchema>;
