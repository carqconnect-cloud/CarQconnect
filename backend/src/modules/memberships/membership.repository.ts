import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export const membershipRepository = {
  async listActivePlans() {
    return prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });
  },

  async findPlanById(id: string) {
    return prisma.subscriptionPlan.findUnique({
      where: { id },
    });
  },

  async findPlanBySlug(slug: string) {
    return prisma.subscriptionPlan.findFirst({
      where: { name: { equals: slug, mode: 'insensitive' } },
    });
  },

  async findActiveSubscription(userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });
  },

  async findSubscriptionByPaymentId(_paymentId: string) {
    return null;
  },

  async listUserSubscriptions(userId: string) {
    const items = await prisma.userSubscription.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      include: {
        plan: true,
      },
    });

    const now = new Date();
    return items.map((sub) => {
      const isTimeExpired = sub.endDate ? sub.endDate.getTime() <= now.getTime() : false;
      const effectiveStatus =
        sub.status === 'ACTIVE' && isTimeExpired ? 'EXPIRED' : sub.status;

      return {
        ...sub,
        effectiveStatus,
        isExpired: isTimeExpired,
        planName: sub.plan.name,
        priceInRupees: sub.plan.price,
      };
    });
  },

  async createSubscription(
    data: {
      userId: string;
      planId: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.userSubscription.upsert({
      where: { userId: data.userId },
      update: {
        planId: data.planId,
        status: data.status || 'ACTIVE',
        startDate: data.startDate || new Date(),
        endDate: data.endDate ?? null,
      },
      create: {
        userId: data.userId,
        planId: data.planId,
        status: data.status || 'ACTIVE',
        startDate: data.startDate || new Date(),
        endDate: data.endDate ?? null,
      },
      include: {
        plan: true,
      },
    });
  },

  async updateSubscription(
    id: string,
    data: Prisma.UserSubscriptionUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.userSubscription.update({
      where: { id },
      data,
      include: {
        plan: true,
      },
    });
  },
};
