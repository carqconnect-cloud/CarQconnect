import { z } from 'zod';

export const AI_KNOWLEDGE_CATEGORIES = ['Product', 'Billing', 'Safety', 'Account'] as const;
export type AiKnowledgeCategory = (typeof AI_KNOWLEDGE_CATEGORIES)[number];

export const AI_KNOWLEDGE_STATUSES = ['draft', 'published'] as const;
export type AiKnowledgeStatus = (typeof AI_KNOWLEDGE_STATUSES)[number];

export const aiKnowledgeCategorySchema = z.enum(AI_KNOWLEDGE_CATEGORIES, {
  errorMap: () => ({ message: 'Category must be one of: Product, Billing, Safety, Account' }),
});

export const aiKnowledgeStatusSchema = z.enum(AI_KNOWLEDGE_STATUSES, {
  errorMap: () => ({ message: 'Status must be either draft or published' }),
});

export const createKnowledgeArticleSchema = z
  .object({
    question: z.string().trim().min(1, 'Question is required').max(255, 'Question must not exceed 255 characters'),
    answer: z.string().nullable().optional(),
    category: aiKnowledgeCategorySchema,
    status: aiKnowledgeStatusSchema.default('draft'),
  })
  .refine(
    (data) => {
      if (data.status === 'published') {
        return typeof data.answer === 'string' && data.answer.trim().length >= 10;
      }
      return true;
    },
    {
      message: 'Published articles require a trimmed answer containing at least 10 characters',
      path: ['answer'],
    },
  );

export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;

export const updateKnowledgeArticleSchema = z
  .object({
    question: z.string().trim().min(1, 'Question cannot be empty').max(255).optional(),
    answer: z.string().nullable().optional(),
    category: aiKnowledgeCategorySchema.optional(),
    status: aiKnowledgeStatusSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'published' && data.answer !== undefined) {
        return typeof data.answer === 'string' && data.answer.trim().length >= 10;
      }
      return true;
    },
    {
      message: 'Published articles require a trimmed answer containing at least 10 characters',
      path: ['answer'],
    },
  );

export type UpdateKnowledgeArticleInput = z.infer<typeof updateKnowledgeArticleSchema>;

export const updateKnowledgeStatusSchema = z.object({
  status: aiKnowledgeStatusSchema,
});

export type UpdateKnowledgeStatusInput = z.infer<typeof updateKnowledgeStatusSchema>;

export const listKnowledgeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: aiKnowledgeCategorySchema.optional(),
  status: aiKnowledgeStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export type ListKnowledgeQueryInput = z.infer<typeof listKnowledgeQuerySchema>;

export const updateIntentThresholdSchema = z.object({
  threshold: z
    .number({ invalid_type_error: 'Threshold must be a number' })
    .min(0, 'Threshold must be between 0 and 1 inclusive')
    .max(1, 'Threshold must be between 0 and 1 inclusive'),
});

export type UpdateIntentThresholdInput = z.infer<typeof updateIntentThresholdSchema>;

export const updateToolPermissionsSchema = z
  .object({
    read: z.boolean().optional(),
    write: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.read === false && data.write === true) {
        return false;
      }
      return true;
    },
    {
      message: 'Write access cannot be enabled when read access is disabled',
      path: ['write'],
    },
  );

export type UpdateToolPermissionsInput = z.infer<typeof updateToolPermissionsSchema>;

export const createEscalationRuleSchema = z.object({
  condition: z.string().trim().min(1, 'Condition is required').max(255, 'Condition must not exceed 255 characters'),
  action: z.string().trim().min(1, 'Action is required').max(255, 'Action must not exceed 255 characters'),
  active: z.boolean().default(true),
});

export type CreateEscalationRuleInput = z.infer<typeof createEscalationRuleSchema>;

export const updateEscalationRuleSchema = z.object({
  condition: z.string().trim().min(1).max(255).optional(),
  action: z.string().trim().min(1).max(255).optional(),
  active: z.boolean().optional(),
});

export type UpdateEscalationRuleInput = z.infer<typeof updateEscalationRuleSchema>;

export const idParamSchema = z.object({
  id: z.string().trim().min(1, 'ID is required'),
});

export const toolKeyParamSchema = z.object({
  toolKey: z.string().trim().min(1, 'Tool key is required'),
});
