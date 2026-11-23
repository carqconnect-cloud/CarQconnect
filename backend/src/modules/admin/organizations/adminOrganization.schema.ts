import { z } from 'zod';
import { paginationSchema } from '../../../common/validators/common.schema';

const booleanStringSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((val) => val === 'true' || val === '1')
  .optional();

export const listAdminOrganizationsSchema = paginationSchema.extend({
  isActive: booleanStringSchema,
});

export type ListAdminOrganizationsInput = z.infer<typeof listAdminOrganizationsSchema>;

export const ADMIN_ORGANIZATION_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'slug',
] as const;

export type AdminOrganizationSortableField = (typeof ADMIN_ORGANIZATION_SORTABLE_FIELDS)[number];

export const updateOrganizationStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
  reason: z.string().trim().max(500, 'Reason must not exceed 500 characters').optional(),
});

export type UpdateOrganizationStatusInput = z.infer<typeof updateOrganizationStatusSchema>;
