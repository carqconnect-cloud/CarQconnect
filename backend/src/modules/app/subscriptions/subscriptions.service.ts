import { prisma } from '../../../config/database';
import crypto from 'crypto';
import { getRazorpay } from '../../../config/razorpay';
import { syncUserToCustomer } from '../../../common/utils/customerSync';

export const subscriptionsService = {
  async getPlans() {
    return prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });
  },

  async activatePlan(userId: string, planId: string) {
    // Upsert user subscription
    const sub = await prisma.userSubscription.upsert({
      where: { userId },
      update: {
        planId,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: null,
      },
      create: {
        userId,
        planId,
        status: 'ACTIVE',
      },
    });

    // Sync to CRM Customer record
    syncUserToCustomer(userId).catch(console.error);

    return sub;
  },

  async getMySubscription(userId: string) {
    return prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  },

  async createRazorpayOrder(amount: number) {
    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: 'INR',
      receipt: `sub_receipt_${Date.now()}`,
    };
    return getRazorpay().orders.create(options);
  },

  async verifyPayment(razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) {
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    return generated_signature === razorpay_signature;
  },
};
