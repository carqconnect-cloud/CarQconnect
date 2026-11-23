import { z } from 'zod';

export const SUPPORTED_REPORT_KEYS = [
  'users',
  'revenue',
  'qr-scans',
  'device-activation',
  'membership-conv',
  'support-volume',
  'ai-containment',
  'call-outcomes',
] as const;

export type SupportedReportKey = (typeof SUPPORTED_REPORT_KEYS)[number];

export const reportKeyParamSchema = z.object({
  reportKey: z.enum(SUPPORTED_REPORT_KEYS, {
    errorMap: () => ({
      message: `Invalid report key. Supported keys: ${SUPPORTED_REPORT_KEYS.join(', ')}`,
    }),
  }),
});

export const getReportQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  status: z.string().trim().optional(),
  type: z.string().trim().optional(),
  category: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  format: z.enum(['json', 'csv']).default('json'),
});

export type GetReportQueryInput = z.infer<typeof getReportQuerySchema>;

export const exportReportQuerySchema = getReportQuerySchema.omit({ format: true, page: true, limit: true }).extend({
  limit: z.coerce.number().int().min(1).max(10000).default(5000),
});

export type ExportReportQueryInput = z.infer<typeof exportReportQuerySchema>;
