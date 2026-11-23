import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { membershipController } from './membership.controller';
import {
  cancelSubscriptionSchema,
  createCheckoutSchema,
  subscribeSchema,
  updatePreferencesSchema,
} from './membership.schema';

export const membershipRouter = Router();

// Browse plans (publicly accessible)
membershipRouter.get('/plans', asyncHandler(membershipController.listPlans));

// Customer subscription management (authenticated)
membershipRouter.get(
  '/my-subscription',
  requireAuth,
  asyncHandler(membershipController.getCurrentSubscription),
);

membershipRouter.get(
  '/entitlements',
  requireAuth,
  asyncHandler(membershipController.getEffectiveEntitlements),
);

membershipRouter.post(
  ['/checkout', '/create-checkout'],
  requireAuth,
  validate({ body: createCheckoutSchema }),
  asyncHandler(membershipController.createCheckout),
);

membershipRouter.post(
  '/subscribe',
  requireAuth,
  validate({ body: subscribeSchema }),
  asyncHandler(membershipController.subscribe),
);

membershipRouter.patch(
  ['/preferences', '/my-subscription'],
  requireAuth,
  validate({ body: updatePreferencesSchema }),
  asyncHandler(membershipController.updatePreferences),
);

membershipRouter.post(
  '/cancel',
  requireAuth,
  validate({ body: cancelSubscriptionSchema }),
  asyncHandler(membershipController.cancelSubscription),
);

membershipRouter.get(
  '/history',
  requireAuth,
  asyncHandler(membershipController.getHistory),
);
