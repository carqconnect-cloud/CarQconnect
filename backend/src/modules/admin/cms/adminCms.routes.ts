import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminCmsController } from './adminCms.controller';
import {
  audiencePreviewQuerySchema,
  createBannerSchema,
  createCampaignSchema,
  idParamSchema,
  listBannersQuerySchema,
  listCampaignsQuerySchema,
  updateBannerSchema,
  updateCampaignSchema,
} from './adminCms.schema';

// -----------------------------------------------------------------------------
// Banners Router (/api/v1/admin/banners)
// -----------------------------------------------------------------------------

export const adminBannerRoutes = Router();

adminBannerRoutes.get(
  '/',
  validate({ query: listBannersQuerySchema }),
  asyncHandler(adminCmsController.listBanners),
);

adminBannerRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminCmsController.getBannerById),
);

adminBannerRoutes.post(
  '/',
  validate({ body: createBannerSchema }),
  asyncHandler(adminCmsController.createBanner),
);

adminBannerRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateBannerSchema }),
  asyncHandler(adminCmsController.updateBanner),
);

adminBannerRoutes.patch(
  '/:id/status',
  validate({ params: idParamSchema }),
  asyncHandler(adminCmsController.toggleBannerStatus),
);

adminBannerRoutes.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminCmsController.deleteBanner),
);

// -----------------------------------------------------------------------------
// Notification Campaigns Router (/api/v1/admin/campaigns)
// -----------------------------------------------------------------------------

export const adminCampaignRoutes = Router();

adminCampaignRoutes.get(
  '/audience-preview',
  validate({ query: audiencePreviewQuerySchema }),
  asyncHandler(adminCmsController.previewAudience),
);

adminCampaignRoutes.get(
  '/',
  validate({ query: listCampaignsQuerySchema }),
  asyncHandler(adminCmsController.listCampaigns),
);

adminCampaignRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminCmsController.getCampaignById),
);

adminCampaignRoutes.post(
  '/',
  validate({ body: createCampaignSchema }),
  asyncHandler(adminCmsController.createCampaign),
);

adminCampaignRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCampaignSchema }),
  asyncHandler(adminCmsController.updateCampaign),
);

adminCampaignRoutes.post(
  '/:id/send',
  validate({ params: idParamSchema }),
  asyncHandler(adminCmsController.sendCampaign),
);

adminCampaignRoutes.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminCmsController.deleteCampaign),
);
