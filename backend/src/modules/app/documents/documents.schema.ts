import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  docType: z.string().optional().default('GENERAL'),
  status: z.string().optional().default('ACTIVE'),
  regNumber: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),
  issueDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  reminderEnabled: z.boolean().default(true),
  bankName: z.string().optional().nullable(),
  frontImageUrl: z.string().url().optional().nullable(),
  backImageUrl: z.string().url().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
