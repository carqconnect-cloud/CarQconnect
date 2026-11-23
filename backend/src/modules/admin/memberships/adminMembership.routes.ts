import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminMembershipController } from './adminMembership.controller';
import {
  createPlanSchema,
  listSubscriptionsQuerySchema,
  renewalsQuerySchema,
  updatePlanSchema,
  updateSubscriptionStatusSchema,
} from './adminMembership.schema';

export const adminMembershipRoutes = Router();

// Plans management
adminMembershipRoutes.get('/plans', asyncHandler(adminMembershipController.listPlans));

adminMembershipRoutes.post(
  '/plans',
  validate({ body: createPlanSchema }),
  asyncHandler(adminMembershipController.createPlan),
);

adminMembershipRoutes.get('/plans/:id', asyncHandler(adminMembershipController.getPlanById));

adminMembershipRoutes.put(
  '/plans/:id',
  validate({ body: updatePlanSchema }),
  asyncHandler(adminMembershipController.updatePlan),
);

adminMembershipRoutes.patch(
  '/plans/:id',
  validate({ body: updatePlanSchema }),
  asyncHandler(adminMembershipController.updatePlan),
);

adminMembershipRoutes.delete(
  '/plans/:id',
  asyncHandler(adminMembershipController.deletePlan),
);

// Subscription monitoring
adminMembershipRoutes.get(
  '/subscriptions',
  validate({ query: listSubscriptionsQuerySchema }),
  asyncHandler(adminMembershipController.listSubscriptions),
);

adminMembershipRoutes.get(
  '/subscriptions/:id',
  asyncHandler(adminMembershipController.getSubscriptionById),
);

adminMembershipRoutes.patch(
  '/subscriptions/:id/status',
  validate({ body: updateSubscriptionStatusSchema }),
  asyncHandler(adminMembershipController.updateSubscriptionStatus),
);

// Renewals desk & reminders
adminMembershipRoutes.get(
  '/renewals',
  validate({ query: renewalsQuerySchema }),
  asyncHandler(adminMembershipController.listRenewals),
);

adminMembershipRoutes.post(
  '/subscriptions/:id/remind',
  asyncHandler(adminMembershipController.recordReminder),
);
