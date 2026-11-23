import { z } from 'zod';
import { paginationSchema } from '../../../common/validators/common.schema';

const booleanStringSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((val) => val === 'true' || val === '1')
  .optional();

export const listAdminUsersSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  plan: z.string().trim().optional(),
  health: z.string().trim().optional(),
  isActive: booleanStringSchema,
  isSuperAdmin: booleanStringSchema,
});

export type ListAdminUsersInput = z.infer<typeof listAdminUsersSchema>;

export const ADMIN_USER_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'email',
  'name',
] as const;

export type AdminUserSortableField = (typeof ADMIN_USER_SORTABLE_FIELDS)[number];

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
  reason: z.string().trim().max(500, 'Reason must not exceed 500 characters').optional(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  plan: z.string().trim().optional(),
  password: z.string().min(6).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export const updateAdminUserSchema = z.object({
  name: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  plan: z.string().trim().optional(),
  health: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
