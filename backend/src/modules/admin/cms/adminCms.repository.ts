import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export const adminCmsRepository = {
  // ---------------------------------------------------------------------------
  // Banners
  // ---------------------------------------------------------------------------

  async findBanners(params: {
    where?: Prisma.BannerWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.BannerOrderByWithRelationInput;
  }) {
    const { where, skip, take, orderBy } = params;
    return prisma.banner.findMany({
      where,
      skip,
      take,
      orderBy: orderBy || [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async countBanners(where?: Prisma.BannerWhereInput): Promise<number> {
    return prisma.banner.count({ where });
  },

  async findBannerById(id: string) {
    return prisma.banner.findUnique({
      where: { id },
    });
  },

  async createBanner(data: Prisma.BannerCreateInput) {
    return prisma.banner.create({
      data,
    });
  },

  async updateBanner(id: string, data: Prisma.BannerUpdateInput) {
    return prisma.banner.update({
      where: { id },
      data,
    });
  },

  async deleteBanner(id: string) {
    return prisma.banner.delete({
      where: { id },
    });
  },

  // ---------------------------------------------------------------------------
  // Notification Campaigns
  // ---------------------------------------------------------------------------

  async findCampaigns(params: {
    where?: Prisma.NotificationCampaignWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.NotificationCampaignOrderByWithRelationInput;
  }) {
    const { where, skip, take, orderBy } = params;
    return prisma.notificationCampaign.findMany({
      where,
      skip,
      take,
      orderBy: orderBy || { createdAt: 'desc' },
    });
  },

  async countCampaigns(
    where?: Prisma.NotificationCampaignWhereInput,
  ): Promise<number> {
    return prisma.notificationCampaign.count({ where });
  },

  async findCampaignById(id: string) {
    return prisma.notificationCampaign.findUnique({
      where: { id },
    });
  },

  async createCampaign(data: Prisma.NotificationCampaignCreateInput) {
    return prisma.notificationCampaign.create({
      data,
    });
  },

  async updateCampaign(
    id: string,
    data: Prisma.NotificationCampaignUpdateInput,
  ) {
    return prisma.notificationCampaign.update({
      where: { id },
      data,
    });
  },

  async deleteCampaign(id: string) {
    return prisma.notificationCampaign.delete({
      where: { id },
    });
  },

  // ---------------------------------------------------------------------------
  // Audience Calculations
  // ---------------------------------------------------------------------------

  async calculateAudienceCount(audience: string): Promise<number> {
    if (audience === 'All active users') {
      return prisma.user.count({
        where: { isActive: true },
      });
    }

    if (audience === 'Expiring in 15 days') {
      const now = new Date();
      const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      const distinctUsers = await prisma.userSubscription.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: in15Days,
          },
        },
        select: { userId: true },
        distinct: ['userId'],
      });

      return distinctUsers.length;
    }

    if (audience === 'Balance < ₹100') {
      // Truthful schema boundary: wallet/balance entity does not exist in schema.
      return 0;
    }

    if (audience === 'Users without emergency contact') {
      return prisma.user.count({
        where: {
          isActive: true,
          emergencyContacts: {
            none: {},
          },
        },
      });
    }

    return 0;
  },
};
