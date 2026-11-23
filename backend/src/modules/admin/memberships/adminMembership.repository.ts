import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import type {
  CreatePlanInput,
  ListSubscriptionsQueryInput,
  UpdatePlanInput,
} from './adminMembership.schema';

export const adminMembershipRepository = {
  async listPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });

    const now = new Date();
    const plansWithStats = await Promise.all(
      plans.map(async (plan) => {
        const [totalSubscribers, activeSubscribers] = await Promise.all([
          prisma.userSubscription.count({
            where: { planId: plan.id },
          }),
          prisma.userSubscription.count({
            where: {
              planId: plan.id,
              status: 'ACTIVE',
              OR: [
                { endDate: null },
                { endDate: { gt: now } },
              ],
            },
          }),
        ]);

        return {
          ...plan,
          totalSubscribers,
          activeSubscribers,
        };
      }),
    );

    return plansWithStats;
  },

  async findPlanById(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!plan) return null;

    const now = new Date();
    const [totalSubscribers, activeSubscribers] = await Promise.all([
      prisma.userSubscription.count({
        where: { planId: plan.id },
      }),
      prisma.userSubscription.count({
        where: {
          planId: plan.id,
          status: 'ACTIVE',
          OR: [
            { endDate: null },
            { endDate: { gt: now } },
          ],
        },
      }),
    ]);

    return {
      ...plan,
      totalSubscribers,
      activeSubscribers,
    };
  },

  async createPlan(data: CreatePlanInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.subscriptionPlan.create({
      data: {
        name: data.name,
        price: data.price,
        badge: data.badge ?? null,
        description: data.description || '',
        features: (data.features as Prisma.InputJsonValue) || [],
      },
    });
  },

  async updatePlan(id: string, data: UpdatePlanInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const updateData: Prisma.SubscriptionPlanUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.features !== undefined) {
      updateData.features = data.features as Prisma.InputJsonValue;
    }

    return db.subscriptionPlan.update({
      where: { id },
      data: updateData,
    });
  },

  async deletePlan(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.subscriptionPlan.delete({
      where: { id },
    });
  },

  async countSubscriptionsByPlanId(planId: string) {
    return prisma.userSubscription.count({
      where: { planId },
    });
  },

  async listSubscriptions(query: ListSubscriptionsQueryInput) {
    const { page, limit, search, status, planId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserSubscriptionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { plan: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              badge: true,
              description: true,
            },
          },
        },
      }),
      prisma.userSubscription.count({ where }),
    ]);

    const now = new Date();
    const formatted = items.map((sub) => {
      const isTimeExpired = sub.endDate ? sub.endDate.getTime() <= now.getTime() : false;
      const effectiveStatus =
        sub.status === 'ACTIVE' && isTimeExpired
          ? 'EXPIRED'
          : sub.status;

      const userName = sub.user
        ? `${sub.user.firstName ?? ''} ${sub.user.lastName ?? ''}`.trim() || sub.user.email
        : 'User';

      return {
        id: sub.id,
        userId: sub.userId,
        userName,
        userEmail: sub.user?.email,
        userPhone: sub.user?.phone,
        planId: sub.planId,
        planName: sub.plan?.name || 'Standard Plan',
        planPrice: sub.plan?.price ?? 0,
        badge: sub.plan?.badge,
        status: effectiveStatus,
        isExpired: isTimeExpired,
        startDate: sub.startDate,
        startedAt: sub.startDate,
        endDate: sub.endDate,
        expiresAt: sub.endDate,
        user: sub.user,
        plan: sub.plan,
      };
    });

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async findSubscriptionById(id: string) {
    const sub = await prisma.userSubscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        plan: true,
      },
    });

    if (!sub) return null;

    const now = new Date();
    const isTimeExpired = sub.endDate ? sub.endDate.getTime() <= now.getTime() : false;
    const effectiveStatus =
      sub.status === 'ACTIVE' && isTimeExpired ? 'EXPIRED' : sub.status;

    const userName = sub.user
      ? `${sub.user.firstName ?? ''} ${sub.user.lastName ?? ''}`.trim() || sub.user.email
      : 'User';

    return {
      ...sub,
      userName,
      userEmail: sub.user?.email,
      userPhone: sub.user?.phone,
      planName: sub.plan?.name,
      planPrice: sub.plan?.price,
      effectiveStatus,
      isExpired: isTimeExpired,
      startedAt: sub.startDate,
      expiresAt: sub.endDate,
    };
  },

  async updateSubscriptionStatus(
    id: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.userSubscription.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        plan: true,
      },
    });
  },

  async listExpiringRenewals(days: number = 30) {
    const now = new Date();
    const futureLimit = new Date(now.getTime() + days * 86400000);

    const items = await prisma.userSubscription.findMany({
      where: {
        endDate: {
          lte: futureLimit,
        },
      },
      orderBy: { endDate: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            badge: true,
          },
        },
      },
    });

    return items.map((sub) => {
      const expiry = sub.endDate ? new Date(sub.endDate) : now;
      const msDiff = expiry.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      return {
        id: sub.id,
        userId: sub.userId,
        userName: `${sub.user.firstName ?? ''} ${sub.user.lastName ?? ''}`.trim() || sub.user.email,
        userEmail: sub.user.email,
        userPhone: sub.user.phone,
        planName: sub.plan.name,
        planPrice: sub.plan.price,
        startDate: sub.startDate,
        endDate: sub.endDate,
        expiresAt: sub.endDate,
        status: sub.status,
        daysRemaining,
        isExpired: msDiff <= 0,
      };
    });
  },

  async recordReminder(id: string, _tx?: Prisma.TransactionClient) {
    // Record reminder acknowledged for subscription
    return { id, remindedAt: new Date() };
  },
};
