import type { Prisma } from '@prisma/client';
import { ApiError } from '../../../common/utils/apiError';
import { auditService } from '../../audit/audit.service';
import { adminCmsRepository } from './adminCms.repository';
import type {
  CreateBannerInput,
  CreateCampaignInput,
  ListBannersQueryInput,
  ListCampaignsQueryInput,
  UpdateBannerInput,
  UpdateCampaignInput,
} from './adminCms.schema';

export const adminCmsService = {
  // ---------------------------------------------------------------------------
  // Banners
  // ---------------------------------------------------------------------------

  async listBanners(query: ListBannersQueryInput) {
    const where: Prisma.BannerWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { schedule: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [items, total] = await Promise.all([
      adminCmsRepository.findBanners({ where, skip, take }),
      adminCmsRepository.countBanners(where),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      items,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  },

  async getBannerById(id: string) {
    const banner = await adminCmsRepository.findBannerById(id);
    if (!banner) {
      throw ApiError.notFound(`Banner with ID '${id}' not found`);
    }
    return banner;
  },

  async createBanner(input: CreateBannerInput, actorId?: string) {
    const banner = await adminCmsRepository.createBanner({
      title: input.title,
      schedule: input.schedule,
      status: input.status,
      targetUrl: input.targetUrl,
      imageUrl: input.imageUrl,
      priority: input.priority,
    });

    await auditService.record({
      action: 'admin_banner.created',
      entity: 'Banner',
      entityId: banner.id,
      actorId,
      metadata: {
        title: banner.title,
        status: banner.status,
        schedule: banner.schedule,
      },
    });

    return banner;
  },

  async updateBanner(id: string, input: UpdateBannerInput, actorId?: string) {
    await this.getBannerById(id);

    const banner = await adminCmsRepository.updateBanner(id, {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.schedule !== undefined && { schedule: input.schedule }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.targetUrl !== undefined && { targetUrl: input.targetUrl }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.priority !== undefined && { priority: input.priority }),
    });

    await auditService.record({
      action: 'admin_banner.updated',
      entity: 'Banner',
      entityId: banner.id,
      actorId,
      metadata: {
        title: banner.title,
        status: banner.status,
      },
    });

    return banner;
  },

  async toggleBannerStatus(id: string, actorId?: string) {
    const existing = await this.getBannerById(id);

    const newStatus = existing.status === 'live' ? 'paused' : 'live';

    const banner = await adminCmsRepository.updateBanner(id, {
      status: newStatus,
    });

    await auditService.record({
      action: 'admin_banner.status_updated',
      entity: 'Banner',
      entityId: banner.id,
      actorId,
      metadata: {
        previousStatus: existing.status,
        newStatus: banner.status,
      },
    });

    return banner;
  },

  async deleteBanner(id: string, actorId?: string) {
    const existing = await this.getBannerById(id);

    await adminCmsRepository.deleteBanner(id);

    await auditService.record({
      action: 'admin_banner.deleted',
      entity: 'Banner',
      entityId: id,
      actorId,
      metadata: {
        title: existing.title,
      },
    });

    return { success: true, id };
  },

  // ---------------------------------------------------------------------------
  // Notification Campaigns
  // ---------------------------------------------------------------------------

  async listCampaigns(query: ListCampaignsQueryInput) {
    const where: Prisma.NotificationCampaignWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.channel) {
      where.channel = query.channel;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
        { audience: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [items, total] = await Promise.all([
      adminCmsRepository.findCampaigns({ where, skip, take }),
      adminCmsRepository.countCampaigns(where),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      items,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  },

  async getCampaignById(id: string) {
    const campaign = await adminCmsRepository.findCampaignById(id);
    if (!campaign) {
      throw ApiError.notFound(`Campaign with ID '${id}' not found`);
    }
    return campaign;
  },

  async createCampaign(input: CreateCampaignInput, actorId?: string) {
    const campaign = await adminCmsRepository.createCampaign({
      name: input.name,
      channel: input.channel,
      audience: input.audience,
      message: input.message,
      status: input.status,
      scheduledAt: input.scheduledAt,
      isSimulated: true,
    });

    await auditService.record({
      action: 'admin_campaign.created',
      entity: 'NotificationCampaign',
      entityId: campaign.id,
      actorId,
      metadata: {
        name: campaign.name,
        channel: campaign.channel,
        audience: campaign.audience,
        status: campaign.status,
      },
    });

    return campaign;
  },

  async updateCampaign(
    id: string,
    input: UpdateCampaignInput,
    actorId?: string,
  ) {
    const existing = await this.getCampaignById(id);

    if (existing.status === 'Sent') {
      throw ApiError.badRequest('Cannot edit a campaign that has already been sent');
    }

    const campaign = await adminCmsRepository.updateCampaign(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.channel !== undefined && { channel: input.channel }),
      ...(input.audience !== undefined && { audience: input.audience }),
      ...(input.message !== undefined && { message: input.message }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
    });

    await auditService.record({
      action: 'admin_campaign.updated',
      entity: 'NotificationCampaign',
      entityId: campaign.id,
      actorId,
      metadata: {
        name: campaign.name,
        status: campaign.status,
      },
    });

    return campaign;
  },

  async sendCampaign(id: string, actorId?: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === 'Sent') {
      throw ApiError.badRequest('Campaign has already been sent');
    }

    // Calculate audience membership from live database records
    const targetCount = await adminCmsRepository.calculateAudienceCount(
      campaign.audience,
    );

    const sentAt = new Date();
    const updated = await adminCmsRepository.updateCampaign(id, {
      status: 'Sent',
      sentAt,
      targetCount,
      isSimulated: true,
      metadata: {
        simulated: true,
        channel: campaign.channel,
        audience: campaign.audience,
        resolvedRecipients: targetCount,
        note: 'Simulated execution: external carrier gateways deferred to Phase 3 Backlog per API.md',
      },
    });

    await auditService.record({
      action: 'admin_campaign.sent',
      entity: 'NotificationCampaign',
      entityId: campaign.id,
      actorId,
      metadata: {
        name: campaign.name,
        channel: campaign.channel,
        audience: campaign.audience,
        targetCount,
        isSimulated: true,
      },
    });

    return updated;
  },

  async deleteCampaign(id: string, actorId?: string) {
    const existing = await this.getCampaignById(id);

    await adminCmsRepository.deleteCampaign(id);

    await auditService.record({
      action: 'admin_campaign.deleted',
      entity: 'NotificationCampaign',
      entityId: id,
      actorId,
      metadata: {
        name: existing.name,
        status: existing.status,
      },
    });

    return { success: true, id };
  },

  async previewAudience(audience: string) {
    const count = await adminCmsRepository.calculateAudienceCount(audience);
    let description = '';

    switch (audience) {
      case 'All active users':
        description = 'All registered users with active account status';
        break;
      case 'Expiring in 15 days':
        description = 'Users with an active membership expiring within the next 15 days';
        break;
      case 'Balance < ₹100':
        description = 'Users with wallet / FASTag balance below ₹100 (unconfigured in current schema)';
        break;
      case 'Users without emergency contact':
        description = 'Active users who have zero configured SOS emergency contacts';
        break;
      default:
        description = 'Custom audience segment';
    }

    return {
      audience,
      count,
      description,
    };
  },
};
