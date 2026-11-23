import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminCmsService } from './adminCms.service';
import type {
  AudiencePreviewQueryInput,
  CreateBannerInput,
  CreateCampaignInput,
  ListBannersQueryInput,
  ListCampaignsQueryInput,
  UpdateBannerInput,
  UpdateCampaignInput,
} from './adminCms.schema';

export const adminCmsController = {
  // ---------------------------------------------------------------------------
  // Banners
  // ---------------------------------------------------------------------------

  async listBanners(req: Request, res: Response) {
    const query = req.query as unknown as ListBannersQueryInput;
    const result = await adminCmsService.listBanners(query);
    return ApiResponse.ok(res, result.items, { pagination: result.pagination });
  },

  async getBannerById(req: Request, res: Response) {
    const id = req.params.id as string;
    const banner = await adminCmsService.getBannerById(id);
    return ApiResponse.ok(res, banner);
  },

  async createBanner(req: Request, res: Response) {
    const body = req.body as CreateBannerInput;
    const actorId = req.auth?.userId;
    const banner = await adminCmsService.createBanner(body, actorId);
    return ApiResponse.created(res, banner);
  },

  async updateBanner(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateBannerInput;
    const actorId = req.auth?.userId;
    const updated = await adminCmsService.updateBanner(id, body, actorId);
    return ApiResponse.ok(res, updated);
  },

  async toggleBannerStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const updated = await adminCmsService.toggleBannerStatus(id, actorId);
    return ApiResponse.ok(res, updated);
  },

  async deleteBanner(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const result = await adminCmsService.deleteBanner(id, actorId);
    return ApiResponse.ok(res, result);
  },

  // ---------------------------------------------------------------------------
  // Notification Campaigns
  // ---------------------------------------------------------------------------

  async listCampaigns(req: Request, res: Response) {
    const query = req.query as unknown as ListCampaignsQueryInput;
    const result = await adminCmsService.listCampaigns(query);
    return ApiResponse.ok(res, result.items, { pagination: result.pagination });
  },

  async getCampaignById(req: Request, res: Response) {
    const id = req.params.id as string;
    const campaign = await adminCmsService.getCampaignById(id);
    return ApiResponse.ok(res, campaign);
  },

  async createCampaign(req: Request, res: Response) {
    const body = req.body as CreateCampaignInput;
    const actorId = req.auth?.userId;
    const campaign = await adminCmsService.createCampaign(body, actorId);
    return ApiResponse.created(res, campaign);
  },

  async updateCampaign(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateCampaignInput;
    const actorId = req.auth?.userId;
    const updated = await adminCmsService.updateCampaign(id, body, actorId);
    return ApiResponse.ok(res, updated);
  },

  async sendCampaign(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const result = await adminCmsService.sendCampaign(id, actorId);
    return ApiResponse.ok(res, result);
  },

  async deleteCampaign(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const result = await adminCmsService.deleteCampaign(id, actorId);
    return ApiResponse.ok(res, result);
  },

  async previewAudience(req: Request, res: Response) {
    const query = req.query as unknown as AudiencePreviewQueryInput;
    const preview = await adminCmsService.previewAudience(query.audience);
    return ApiResponse.ok(res, preview);
  },
};
