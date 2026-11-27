import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { subscriptionsController } from './subscriptions.controller';
import { requireAuth, requireAppUser } from '../../../common/middleware/auth.middleware';

export const subscriptionRouter = Router();

// Publicly accessible for previewing plans and creating checkout orders
subscriptionRouter.get('/plans', asyncHandler(subscriptionsController.getPlans));
subscriptionRouter.post('/create-order', asyncHandler(subscriptionsController.createRazorpayOrder));

// Authenticated user operations
subscriptionRouter.post('/activate', requireAuth, requireAppUser, asyncHandler(subscriptionsController.activatePlan));
subscriptionRouter.get('/my', requireAuth, requireAppUser, asyncHandler(subscriptionsController.getMySubscription));
subscriptionRouter.post('/verify-payment', requireAuth, requireAppUser, asyncHandler(subscriptionsController.verifyPayment));
