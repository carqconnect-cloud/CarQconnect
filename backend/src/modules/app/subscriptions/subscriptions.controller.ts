import { Request, Response } from 'express';
import { subscriptionsService } from './subscriptions.service';

export const subscriptionsController = {
  async getPlans(_req: Request, res: Response) {
    const plans = await subscriptionsService.getPlans();
    res.json({ success: true, data: plans });
  },

  async activatePlan(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { planId, planName } = req.body;
    const targetPlan = planId || planName;
    if (!targetPlan) return res.status(400).json({ success: false, message: 'planId or planName is required' });

    const subscription = await subscriptionsService.activatePlan(userId, targetPlan);
    res.json({ success: true, data: subscription, message: 'Plan activated successfully' });
  },

  async getMySubscription(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const subscription = await subscriptionsService.getMySubscription(userId);
    res.json({ success: true, data: subscription });
  },

  async createRazorpayOrder(req: Request, res: Response) {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });
    
    const order = await subscriptionsService.createRazorpayOrder(Number(amount));
    res.json({ success: true, data: order });
  },

  async verifyPayment(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, planName } = req.body;
    const targetPlan = planId || planName;
    if (!targetPlan) {
      return res.status(400).json({ success: false, message: 'planId or planName is required' });
    }

    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const isValid = await subscriptionsService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }
    }

    const subscription = await subscriptionsService.activatePlan(userId, targetPlan);
    res.json({ success: true, data: subscription, message: 'Subscription upgraded successfully' });
  },
};
