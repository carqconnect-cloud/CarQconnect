import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { webhookController } from './webhook.controller';

export const webhookRouter = Router();

// Endpoint for Razorpay payment & refund webhook callbacks
webhookRouter.post('/razorpay', asyncHandler(webhookController.handleRazorpayWebhook));
