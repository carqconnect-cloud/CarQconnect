import { z } from 'zod';
import { paginationSchema } from '../../../common/validators/common.schema';

const optionalDateSchema = z
  .string()
  .trim()
  .min(1)
  .pipe(z.coerce.date())
  .optional();

export const listAdminAuditLogsSchema = paginationSchema.extend({
  action: z.string().trim().min(1).max(100).optional(),
  entity: z.string().trim().min(1).max(100).optional(),
  entityId: z.string().trim().min(1).max(100).optional(),
  actorId: z.string().trim().min(1).max(100).optional(),
  organizationId: z.string().trim().min(1).max(100).optional(),
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
});

export type ListAdminAuditLogsInput = z.infer<typeof listAdminAuditLogsSchema>;

export const ADMIN_AUDIT_LOG_SORTABLE_FIELDS = [
  'createdAt',
  'action',
  'entity',
] as const;

export type AdminAuditLogSortableField = (typeof ADMIN_AUDIT_LOG_SORTABLE_FIELDS)[number];
