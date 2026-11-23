import { z } from 'zod';

const safeUrlSchema = z
  .string()
  .max(1000)
  .refine(
    (val) => {
      if (!val) return true;
      const trimmed = val.trim().toLowerCase();
      if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')
      ) {
        return false;
      }
      return (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/')
      );
    },
    {
      message:
        'URL must begin with http://, https://, or / and cannot use javascript: or data: schemes',
    },
  );

export const idParamSchema = z.object({
  id: z.string().min(1, 'Identifier is required'),
});

// -----------------------------------------------------------------------------
// Banner Schemas
// -----------------------------------------------------------------------------

export const bannerStatusSchema = z.enum([
  'draft',
  'scheduled',
  'live',
  'paused',
  'archived',
]);

export const createBannerSchema = z.object({
  title: z.string().trim().min(1, 'Banner title is required').max(255),
  schedule: z.string().trim().max(100).default('Not scheduled'),
  status: bannerStatusSchema.default('draft'),
  targetUrl: safeUrlSchema.optional().nullable(),
  imageUrl: safeUrlSchema.optional().nullable(),
  priority: z.number().int().default(0),
});

export const updateBannerSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  schedule: z.string().trim().max(100).optional(),
  status: bannerStatusSchema.optional(),
  targetUrl: safeUrlSchema.optional().nullable(),
  imageUrl: safeUrlSchema.optional().nullable(),
  priority: z.number().int().optional(),
});

export const listBannersQuerySchema = z.object({
  status: bannerStatusSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// -----------------------------------------------------------------------------
// Notification Campaign Schemas
// -----------------------------------------------------------------------------

export const campaignChannelSchema = z.enum([
  'SMS',
  'Push',
  'Email',
  'SMS + Push',
  'Email + Push',
  'In-app',
]);

export const campaignAudienceSchema = z.enum([
  'All active users',
  'Expiring in 15 days',
  'Balance < ₹100',
  'Users without emergency contact',
]);

export const campaignStatusSchema = z.enum([
  'Draft',
  'Scheduled',
  'Sent',
  'Cancelled',
]);

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').max(255),
  channel: campaignChannelSchema,
  audience: campaignAudienceSchema,
  message: z.string().trim().max(2000).optional().nullable(),
  status: campaignStatusSchema.default('Draft'),
  scheduledAt: z.coerce.date().optional().nullable(),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  channel: campaignChannelSchema.optional(),
  audience: campaignAudienceSchema.optional(),
  message: z.string().trim().max(2000).optional().nullable(),
  status: campaignStatusSchema.optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
});

export const listCampaignsQuerySchema = z.object({
  status: campaignStatusSchema.optional(),
  channel: campaignChannelSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const audiencePreviewQuerySchema = z.object({
  audience: campaignAudienceSchema,
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type ListBannersQueryInput = z.infer<typeof listBannersQuerySchema>;

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ListCampaignsQueryInput = z.infer<typeof listCampaignsQuerySchema>;
export type AudiencePreviewQueryInput = z.infer<typeof audiencePreviewQuerySchema>;
