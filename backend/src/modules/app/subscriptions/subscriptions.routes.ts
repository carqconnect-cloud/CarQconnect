import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { subscriptionsController } from './subscriptions.controller';

export const subscriptionRouter = Router();

subscriptionRouter.get('/plans', asyncHandler(subscriptionsController.getPlans));
subscriptionRouter.post('/activate', asyncHandler(subscriptionsController.activatePlan));
subscriptionRouter.get('/my', asyncHandler(subscriptionsController.getMySubscription));
subscriptionRouter.post('/create-order', asyncHandler(subscriptionsController.createRazorpayOrder));
subscriptionRouter.post('/verify-payment', asyncHandler(subscriptionsController.verifyPayment));
