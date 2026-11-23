import { z } from 'zod';
import { QrStatus } from '@prisma/client';

export const qrStatusEnum = z.nativeEnum(QrStatus);

export const listAdminQrQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z
    .string()
    .transform((val) => val.toUpperCase())
    .pipe(qrStatusEnum)
    .optional(),
  batch: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'code', 'batch', 'status', 'scansCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAdminQrQuery = z.infer<typeof listAdminQrQuerySchema>;

export const batchGenerateQrSchema = z
  .object({
    batchName: z.string().trim().min(3).max(64).optional(),
    quantity: z.coerce.number().int().min(1).max(500).default(50),
    codes: z.array(z.string().trim().min(4).max(64)).min(1).max(500).optional(),
  })
  .refine(
    (data) => {
      // If codes array is supplied, check there are no duplicate codes within the input payload
      if (data.codes && data.codes.length > 0) {
        const normalized = data.codes.map((c) => c.toUpperCase());
        return new Set(normalized).size === normalized.length;
      }
      return true;
    },
    {
      message: 'Batch import codes must not contain duplicate entries within the request payload',
      path: ['codes'],
    },
  );

export type BatchGenerateQrInput = z.infer<typeof batchGenerateQrSchema>;

export const assignQrSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle ID is required'),
  notes: z.string().trim().max(500).optional(),
});

export type AssignQrInput = z.infer<typeof assignQrSchema>;

export const replaceQrSchema = z.object({
  replacementCode: z.string().trim().min(4).max(64).optional(),
  replacementQrId: z.string().trim().optional(),
  reason: z.string().trim().max(255).default('Damaged or lost QR sticker'),
  notes: z.string().trim().max(500).optional(),
});

export type ReplaceQrInput = z.infer<typeof replaceQrSchema>;

export const suspendQrSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

export type SuspendQrInput = z.infer<typeof suspendQrSchema>;

export const reactivateQrSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export type ReactivateQrInput = z.infer<typeof reactivateQrSchema>;

export const deactivateQrSchema = z.object({
  reason: z.string().trim().max(255).default('QR sticker permanently deactivated'),
  notes: z.string().trim().max(500).optional(),
});

export type DeactivateQrInput = z.infer<typeof deactivateQrSchema>;

export const listQrScansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListQrScansQuery = z.infer<typeof listQrScansQuerySchema>;

export const customerLinkQrSchema = z.object({
  code: z.string().trim().min(4).max(64),
});

export type CustomerLinkQrInput = z.infer<typeof customerLinkQrSchema>;
