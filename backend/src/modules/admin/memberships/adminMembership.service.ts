import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { auditService } from '../../audit/audit.service';
import { adminMembershipRepository } from './adminMembership.repository';
import type {
  CreatePlanInput,
  ListSubscriptionsQueryInput,
  UpdatePlanInput,
  UpdateSubscriptionStatusInput,
} from './adminMembership.schema';

export const adminMembershipService = {
  async listPlans() {
    return adminMembershipRepository.listPlans();
  },

  async getPlanById(id: string) {
    const plan = await adminMembershipRepository.findPlanById(id);
    if (!plan) {
      throw ApiError.notFound('Subscription plan not found');
    }
    return plan;
  },

  async createPlan(data: CreatePlanInput, actorId?: string, actorEmail?: string) {
    return prisma.$transaction(async (tx) => {
      const plan = await adminMembershipRepository.createPlan(data, tx);

      await auditService.record(
        {
          action: 'subscription_plan.created',
          entity: 'SubscriptionPlan',
          entityId: plan.id,
          metadata: {
            name: plan.name,
            price: plan.price,
            badge: plan.badge,
            actorId,
            actorEmail,
          },
        },
        tx,
      );

      return plan;
    });
  },

  async updatePlan(id: string, data: UpdatePlanInput, actorId?: string, actorEmail?: string) {
    const existing = await adminMembershipRepository.findPlanById(id);
    if (!existing) {
      throw ApiError.notFound('Subscription plan not found');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminMembershipRepository.updatePlan(id, data, tx);

      await auditService.record(
        {
          action: 'subscription_plan.updated',
          entity: 'SubscriptionPlan',
          entityId: updated.id,
          metadata: {
            changes: data,
            actorId,
            actorEmail,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async deletePlan(id: string, actorId?: string, actorEmail?: string) {
    const existing = await adminMembershipRepository.findPlanById(id);
    if (!existing) {
      throw ApiError.notFound('Subscription plan not found');
    }

    const subCount = await adminMembershipRepository.countSubscriptionsByPlanId(id);
    if (subCount > 0) {
      throw ApiError.badRequest(`Cannot delete plan "${existing.name}" because it has ${subCount} subscriber(s).`);
    }

    return prisma.$transaction(async (tx) => {
      await adminMembershipRepository.deletePlan(id, tx);

      await auditService.record(
        {
          action: 'subscription_plan.deleted',
          entity: 'SubscriptionPlan',
          entityId: id,
          metadata: {
            name: existing.name,
            actorId,
            actorEmail,
          },
        },
        tx,
      );

      return { success: true, message: `Plan "${existing.name}" deleted successfully.` };
    });
  },

  async listSubscriptions(query: ListSubscriptionsQueryInput) {
    return adminMembershipRepository.listSubscriptions(query);
  },

  async getSubscriptionById(id: string) {
    const sub = await adminMembershipRepository.findSubscriptionById(id);
    if (!sub) {
      throw ApiError.notFound('Subscription not found');
    }
    return sub;
  },

  async updateSubscriptionStatus(
    id: string,
    input: UpdateSubscriptionStatusInput,
    actorId?: string,
    actorEmail?: string,
  ) {
    const existing = await adminMembershipRepository.findSubscriptionById(id);
    if (!existing) {
      throw ApiError.notFound('Subscription not found');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminMembershipRepository.updateSubscriptionStatus(
        id,
        input.status,
        tx,
      );

      await auditService.record(
        {
          action: 'subscription.status_override',
          entity: 'UserSubscription',
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            newStatus: input.status,
            actorId,
            actorEmail,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async listRenewals(days: number) {
    return adminMembershipRepository.listExpiringRenewals(days);
  },

  async recordReminder(id: string, actorId?: string, actorEmail?: string) {
    const existing = await adminMembershipRepository.findSubscriptionById(id);
    if (!existing) {
      throw ApiError.notFound('Subscription not found');
    }

    return prisma.$transaction(async (tx) => {
      await adminMembershipRepository.recordReminder(id, tx);

      await auditService.record(
        {
          action: 'subscription.reminder_requested',
          entity: 'UserSubscription',
          entityId: id,
          metadata: {
            planId: existing.planId,
            userId: existing.userId,
            actorId,
            actorEmail,
          },
        },
        tx,
      );

      return {
        success: true,
        message: `Renewal reminder recorded for ${existing.userName}.`,
        subscriptionId: id,
        delivered: true,
      };
    });
  },
};
