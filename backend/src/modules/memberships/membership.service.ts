import { prisma } from '../../config/database';

export const DEFAULT_BASE_ENTITLEMENTS = {
  tripPlanner: true,
  prioritySupport: true,
  familyAlerts: true,
  gpsLiveTracking: true,
};

export const membershipService = {
  async listActivePlans() {
    return prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });
  },

  async getEffectiveEntitlements(_userId: string) {
    return { ...DEFAULT_BASE_ENTITLEMENTS };
  },

  async getCurrentSubscription(userId: string) {
    const sub = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) {
      return {
        hasActiveSubscription: false,
        subscription: null,
        entitlements: DEFAULT_BASE_ENTITLEMENTS,
      };
    }

    return {
      hasActiveSubscription: sub.status === 'ACTIVE',
      subscription: sub,
      entitlements: DEFAULT_BASE_ENTITLEMENTS,
    };
  },

  async createCheckout() {
    return { checkoutUrl: '' };
  },

  async subscribe(userId: string, planId: string) {
    return prisma.userSubscription.upsert({
      where: { userId },
      update: { planId, status: 'ACTIVE', startDate: new Date() },
      create: { userId, planId, status: 'ACTIVE' },
    });
  },

  async updatePreferences() {
    return { success: true };
  },

  async cancelSubscription(userId: string) {
    return prisma.userSubscription.updateMany({
      where: { userId },
      data: { status: 'CANCELLED' },
    });
  },

  async getHistory(userId: string) {
    return prisma.userSubscription.findMany({
      where: { userId },
      include: { plan: true },
    });
  },
};
