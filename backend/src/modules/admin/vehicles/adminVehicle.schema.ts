import { FuelType } from '@prisma/client';
import { z } from 'zod';

export const listAdminVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  fuel: z
    .preprocess((val) => (typeof val === 'string' && val.trim() !== '' ? val.toUpperCase() : undefined), z.nativeEnum(FuelType))
    .optional(),
  sortBy: z.enum(['reg', 'model', 'fuel', 'docExpiry', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAdminVehiclesQuery = z.infer<typeof listAdminVehiclesQuerySchema>;
