import { z } from 'zod';
import { paginationSchema } from '../../../common/validators/common.schema';

export const listAdminCrmCallsSchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  type: z.enum(['AI', 'HUMAN', 'ai', 'human']).optional(),
  status: z.string().trim().optional(),
});

export type ListAdminCrmCallsInput = z.infer<typeof listAdminCrmCallsSchema>;

export const listAdminCrmLeadsSchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().optional(),
  stage: z.string().trim().optional(),
});

export type ListAdminCrmLeadsInput = z.infer<typeof listAdminCrmLeadsSchema>;
