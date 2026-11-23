import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { SubscriptionStatus } from '@prisma/client';
import { razorpayClient } from '../src/modules/payment/razorpay.client';

describe('Customer Memberships & Entitlements Module (Phase 3E.3)', () => {
  const app = createApp();

  const customer1 = {
    id: 'cust_sub_1',
    email: 'customer1@fioner.test',
    firstName: 'Aarav',
    lastName: 'Sharma',
    isSuperAdmin: false,
    isActive: true,
  };

  const customer2 = {
    id: 'cust_sub_2',
    email: 'customer2@fioner.test',
    firstName: 'Priya',
    lastName: 'Patel',
    isSuperAdmin: false,
    isActive: true,
  };

  const customer1Token = signAccessToken({
    sub: customer1.id,
    email: customer1.email,
    isSuperAdmin: false,
  });

  const customer2Token = signAccessToken({
    sub: customer2.id,
    email: customer2.email,
    isSuperAdmin: false,
  });

  const mockPlanBasic = {
    id: 'pln_basic',
    slug: 'basic',
    name: 'Rakshak Basic',
    priceInPaise: 49900,
    validityDays: 365,
    color: 'info',
    benefits: ['1 vehicle QR', 'Standard calling'],
    entitlements: {
      tripPlanner: false,
      prioritySupport: false,
      familyAlerts: true,
      gpsLiveTracking: false,
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlanPlus = {
    id: 'pln_plus',
    slug: 'plus',
    name: 'Rakshak Plus',
    priceInPaise: 99900,
    validityDays: 365,
    color: 'warning',
    benefits: ['Up to 3 vehicles', 'Trip planner', 'Priority chat'],
    entitlements: {
      tripPlanner: true,
      prioritySupport: true,
      familyAlerts: true,
      gpsLiveTracking: false,
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    razorpayClient.setOrderAdapter(null);
    razorpayClient.setPaymentAdapter(null);

    vi.spyOn(prisma.user, 'findUnique').mockImplementation(
      (async (args: unknown) => {
        const query = args as { where: { id?: string; email?: string } };
        const id = query?.where?.id;
        if (id === customer2.id) return customer2 as never;
        return customer1 as never;
      }) as unknown as typeof prisma.user.findUnique,
    );

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return cb as never;
    });
  });

  describe('Public Plan Browsing', () => {
    it('allows unauthenticated access to browse active plans', async () => {
      vi.spyOn(prisma.membershipPlan, 'findMany').mockResolvedValue([mockPlanBasic, mockPlanPlus] as never);

      const res = await request(app).get('/api/v1/memberships/plans');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].priceInRupees).toBe(499);
      expect(res.body.data[1].priceInRupees).toBe(999);
    });
  });

  describe('Current Subscription & Derived Entitlements', () => {
    it('returns base entitlements when customer has no active subscription', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/memberships/my-subscription')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasActiveSubscription).toBe(false);
      expect(res.body.data.subscription).toBeNull();
      expect(res.body.data.entitlements).toEqual({
        tripPlanner: false,
        prioritySupport: false,
        familyAlerts: false,
        gpsLiveTracking: false,
      });
    });

    it('returns active plan details and premium entitlements for subscribed customer', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 180 * 86400000);

      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_active_1',
        userId: customer1.id,
        planId: mockPlanPlus.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        expiresAt,
        autoRenew: true,
        plan: mockPlanPlus,
      } as never);

      const res = await request(app)
        .get('/api/v1/memberships/my-subscription')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasActiveSubscription).toBe(true);
      expect(res.body.data.subscription.planName).toBe('Rakshak Plus');
      expect(res.body.data.subscription.remainingDays).toBeGreaterThan(0);
      expect(res.body.data.entitlements.tripPlanner).toBe(true);
      expect(res.body.data.entitlements.prioritySupport).toBe(true);
      expect(res.body.data.entitlements.gpsLiveTracking).toBe(false);
    });

    it('revokes premium entitlements and returns base access if subscription is past expiry date', async () => {
      const now = new Date();
      const pastExpiry = new Date(now.getTime() - 2 * 86400000);

      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_expired_1',
        userId: customer1.id,
        planId: mockPlanPlus.id,
        status: SubscriptionStatus.ACTIVE, // Stored as ACTIVE but past expiry!
        startedAt: new Date(now.getTime() - 367 * 86400000),
        expiresAt: pastExpiry,
        autoRenew: false,
        plan: mockPlanPlus,
      } as never);

      const res = await request(app)
        .get('/api/v1/memberships/my-subscription')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasActiveSubscription).toBe(false);
      expect(res.body.data.subscription.isExpired).toBe(true);
      expect(res.body.data.subscription.effectiveStatus).toBe('EXPIRED');
      expect(res.body.data.entitlements.tripPlanner).toBe(false);
    });
  });

  describe('Purchase, Verification, and Lifecycle Transitions', () => {
    const defaultOrderId = 'order_test_12345';
    const defaultSig = 'sig_test_12345';
    const originalVerifyPaymentSignature = razorpayClient.verifyPaymentSignature;

    beforeEach(() => {
      razorpayClient.setPaymentAdapter(null);
      vi.spyOn(razorpayClient, 'verifyPaymentSignature').mockReturnValue(true);
    });

    it('creates a server-calculated Razorpay checkout order for active plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanPlus as never);

      const res = await request(app)
        .post('/api/v1/memberships/create-checkout')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ planId: 'pln_plus' });

      expect(res.status).toBe(200);
      expect(res.body.data.amountInPaise).toBe(99900);
      expect(res.body.data.amountInRupees).toBe(999);
      expect(res.body.data.orderId).toContain('order_');
    });

    it('rejects subscription activation if payment amount does not match server-calculated plan price', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanPlus as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      // Provider payment adapter returns 49900 instead of expected 99900
      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900, // Mismatched amount!
        currency: 'INR',
        status: 'captured',
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_plus',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_mismatch_1',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment amount mismatch');
    });

    it('activates subscription upon verified payment confirmation for new subscriber', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ id: customer1.id }] as never);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: mockPlanBasic.id,
          type: 'membership_subscription',
        },
      }));

      const now = new Date();
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        id: 'sub_new_1',
        userId: customer1.id,
        planId: mockPlanBasic.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        expiresAt: new Date(now.getTime() + 365 * 86400000),
        amountPaidInPaise: 49900,
        paymentId: 'pay_valid_1',
        orderId: defaultOrderId,
        plan: mockPlanBasic,
      } as never);

      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_valid_1',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.amountPaidInPaise).toBe(49900);
    });

    it('extends existing active subscription on verified same-plan renewal', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);

      const now = new Date();
      const currentExpiry = new Date(now.getTime() + 60 * 86400000); // 60 days remaining

      // Existing active subscription
      const existingSub = {
        id: 'sub_existing_1',
        userId: customer1.id,
        planId: mockPlanBasic.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(now.getTime() - 300 * 86400000),
        expiresAt: currentExpiry,
        autoRenew: false,
        plan: mockPlanBasic,
      };

      vi.spyOn(prisma.subscription, 'findFirst')
        .mockResolvedValueOnce(null) // no payment sub match initially
        .mockResolvedValueOnce(existingSub as never); // inside tx find active

      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ id: customer1.id }] as never);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: mockPlanBasic.id,
          type: 'membership_subscription',
        },
      }));

      const expectedNewExpiry = new Date(currentExpiry.getTime() + 365 * 86400000);

      const updateSpy = vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        ...existingSub,
        status: SubscriptionStatus.REPLACED,
        replacedAt: now,
      } as never);

      const createSpy = vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        id: 'sub_renewed_1',
        userId: customer1.id,
        planId: mockPlanBasic.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        expiresAt: expectedNewExpiry,
        autoRenew: false,
        paymentId: 'pay_renew_1',
        orderId: defaultOrderId,
        amountPaidInPaise: 49900,
        plan: mockPlanBasic,
      } as never);

      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_renew_1',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('sub_renewed_1');
      expect(res.body.data.paymentId).toBe('pay_renew_1');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingSub.id },
          data: expect.objectContaining({
            status: SubscriptionStatus.REPLACED,
          }),
        }),
      );
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: customer1.id,
            planId: mockPlanBasic.id,
            status: SubscriptionStatus.ACTIVE,
            paymentId: 'pay_renew_1',
          }),
        }),
      );
    });

    it('supersedes previous plan and creates new subscription when upgrading/replacing plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanPlus as never);

      const now = new Date();
      const existingBasicSub = {
        id: 'sub_basic_1',
        userId: customer1.id,
        planId: mockPlanBasic.id,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(now.getTime() + 100 * 86400000),
        plan: mockPlanBasic,
      };

      vi.spyOn(prisma.subscription, 'findFirst')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingBasicSub as never);

      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ id: customer1.id }] as never);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 99900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: mockPlanPlus.id,
          type: 'membership_subscription',
        },
      }));

      const updateSpy = vi.spyOn(prisma.subscription, 'update').mockResolvedValue({} as never);
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        id: 'sub_plus_new',
        userId: customer1.id,
        planId: mockPlanPlus.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        expiresAt: new Date(now.getTime() + 365 * 86400000),
        orderId: defaultOrderId,
        plan: mockPlanPlus,
      } as never);

      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_plus',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_upgrade_1',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.plan.name).toBe('Rakshak Plus');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub_basic_1' },
          data: expect.objectContaining({ status: 'REPLACED' }),
        }),
      );
    });

    it('returns idempotent response if identical paymentId is resubmitted by the same customer', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_existing',
        userId: customer1.id,
        planId: mockPlanBasic.id,
        status: SubscriptionStatus.ACTIVE,
        paymentId: 'pay_duplicate_1',
        orderId: defaultOrderId,
        plan: mockPlanBasic,
      } as never);

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_duplicate_1',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('already processed');
    });

    it('rejects replaying a payment that was already applied to another customer or plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      // Existing payment was used by customer2, but customer1 tries to use it
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_cust2_payment',
        userId: customer2.id,
        planId: mockPlanBasic.id,
        status: SubscriptionStatus.ACTIVE,
        paymentId: 'pay_claimed_by_other',
        orderId: defaultOrderId,
        plan: mockPlanBasic,
      } as never);

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_claimed_by_other',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already been applied to another subscription or user');
    });

    it('rejects payment if provider notes do not match authenticated user', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: 'different_user_id',
          planId: mockPlanBasic.id,
          type: 'membership_subscription',
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_wrong_user_notes',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment was not issued for this user');
    });

    it('rejects payment if provider notes do not match selected plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: 'different_plan_id',
          type: 'membership_subscription',
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_wrong_plan_notes',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment was not issued for this membership plan');
    });

    it('rejects payment if provider orderId does not match supplied razorpayOrderId', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);
      vi.spyOn(razorpayClient, 'verifyPaymentSignature').mockReturnValue(true);

      const orderId = 'order_client_submitted';
      const paymentId = 'pay_mismatched_order';

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        orderId: 'order_provider_actual',
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: 'sig_mock_valid',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment does not belong to the provided Razorpay order ID');
    });

    it('preserves prior valid subscription if payment verification fails or provider reports failed status', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      const updateSpy = vi.spyOn(prisma.subscription, 'update');
      const createSpy = vi.spyOn(prisma.subscription, 'create');

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'failed',
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_gateway_failed',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment is not in captured status');
      expect(updateSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects authorization-only payment status without capture and preserves existing subscription', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      const updateSpy = vi.spyOn(prisma.subscription, 'update');
      const createSpy = vi.spyOn(prisma.subscription, 'create');

      // Gateway reports 'authorized' instead of 'captured'
      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'authorized',
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_auth_only_1',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment is not in captured status');
      expect(res.body.error.message).toContain('Authorization-only or uncaptured payments cannot activate subscriptions');
      expect(updateSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects refunded payment status and fails closed', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'refunded',
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_already_refunded',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment is not in captured status');
    });

    it('rejects payment if razorpayOrderId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayPaymentId: 'pay_valid_12345',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('Valid Razorpay order ID is required');
    });

    it('rejects payment if razorpayPaymentId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('Valid Razorpay payment ID is required');
    });

    it('rejects payment if razorpaySignature is missing', async () => {
      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_valid_12345',
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('Valid Razorpay payment signature is required');
    });

    it('rejects payment if razorpaySignature is invalid', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);
      vi.spyOn(razorpayClient, 'verifyPaymentSignature').mockReturnValue(false);

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_valid_12345',
          razorpaySignature: 'sig_invalid_tampered',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid Razorpay payment signature');
    });

    it('verifies timing-safe signature calculation using HMAC-SHA256 and secret', async () => {
      vi.spyOn(razorpayClient, 'verifyPaymentSignature').mockImplementation(originalVerifyPaymentSignature);

      const crypto = await import('crypto');
      const secret = 'my_test_razorpay_secret';
      const orderId = 'order_test_timing_safe';
      const paymentId = 'pay_test_timing_safe';
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isVerified = razorpayClient.verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSig,
        secretOverride: secret,
      });
      expect(isVerified).toBe(true);

      const isTampered = razorpayClient.verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: 'tampered_signature_hex_value_that_does_not_match',
        secretOverride: secret,
      });
      expect(isTampered).toBe(false);
    });

    it('rejects payment when provider notes type does not match membership_subscription', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: mockPlanBasic.id,
          type: 'hardware_order', // Foreign purchase intent!
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_foreign_intent',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment was not issued for membership subscription');
    });

    it('fails closed with 404 if user row lock fails to find the user in transaction', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([] as never); // User locked row is empty!

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: mockPlanBasic.id,
          type: 'membership_subscription',
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_user_missing',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('User not found');
    });

    it('rejects payment if provider notes is completely missing or absent', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);
      const createSpy = vi.spyOn(prisma.subscription, 'create');
      const updateSpy = vi.spyOn(prisma.subscription, 'update');
      const auditSpy = vi.spyOn(prisma.auditLog, 'create');

      // Gateway returns valid capture, order, amount, currency, but NO notes
      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_missing_notes_completely',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment is missing server checkout intent metadata');
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(auditSpy).not.toHaveBeenCalled();
    });

    it('rejects payment if provider notes type is missing or incomplete', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: mockPlanBasic.id,
          // type is missing!
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_missing_type_note',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment was not issued for membership subscription checkout');
    });

    it('rejects payment if provider notes userId is missing', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          planId: mockPlanBasic.id,
          type: 'membership_subscription',
          // userId is missing!
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_missing_user_note',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment was not issued for this user');
    });

    it('rejects payment if provider notes planId is missing', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        notes: {
          userId: customer1.id,
          type: 'membership_subscription',
          // planId is missing!
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_missing_plan_note',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment was not issued for this membership plan');
    });

    it('rejects payment if provider currency is not INR', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(mockPlanBasic as never);
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null);

      razorpayClient.setPaymentAdapter(async (id: string) => ({
        id,
        orderId: defaultOrderId,
        amount: 49900,
        currency: 'USD', // Invalid currency!
        status: 'captured',
        notes: {
          userId: customer1.id,
          planId: mockPlanBasic.id,
          type: 'membership_subscription',
        },
      }));

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: 'pln_basic',
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_invalid_usd_currency',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Expected INR');
    });

    it('Policy A: existing eligible subscriber retains entitlements before expiry even after plan is deactivated', async () => {
      const now = new Date();
      const deactivatedPlan = { ...mockPlanPlus, isActive: false };

      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_deactivated_plan',
        userId: customer1.id,
        planId: deactivatedPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        expiresAt: new Date(now.getTime() + 100 * 86400000),
        plan: deactivatedPlan,
      } as never);

      const res = await request(app)
        .get('/api/v1/memberships/my-subscription')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasActiveSubscription).toBe(true);
      expect(res.body.data.entitlements.tripPlanner).toBe(true);
      expect(res.body.data.entitlements.prioritySupport).toBe(true);
    });

    it('Policy A: deactivating a plan rejects new checkout requests with 400 Bad Request', async () => {
      const deactivatedPlan = { ...mockPlanBasic, isActive: false };
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(deactivatedPlan as never);

      const res = await request(app)
        .post('/api/v1/memberships/checkout')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ planId: deactivatedPlan.id });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('currently inactive');
    });

    it('Policy A: deactivating a plan rejects new subscription activation attempts with 400 Bad Request', async () => {
      const deactivatedPlan = { ...mockPlanBasic, isActive: false };
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(deactivatedPlan as never);

      const res = await request(app)
        .post('/api/v1/memberships/subscribe')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planId: deactivatedPlan.id,
          razorpayOrderId: defaultOrderId,
          razorpayPaymentId: 'pay_inactive_plan',
          razorpaySignature: defaultSig,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('currently inactive');
    });

    it('Policy A: independently cancelled or suspended subscriptions do not grant premium entitlements on active plan', async () => {
      const now = new Date();

      // Suspended subscription on active plan
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_suspended',
        userId: customer1.id,
        planId: mockPlanPlus.id,
        status: SubscriptionStatus.SUSPENDED,
        startedAt: now,
        expiresAt: new Date(now.getTime() + 100 * 86400000),
        plan: mockPlanPlus,
      } as never);

      const res = await request(app)
        .get('/api/v1/memberships/my-subscription')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasActiveSubscription).toBe(false);
      expect(res.body.data.entitlements.tripPlanner).toBe(false);
      expect(res.body.data.entitlements.prioritySupport).toBe(false);
    });

    it('Policy A: subscription on deactivated plan loses premium entitlements at the exact boundary of expiry (expiresAt <= now)', async () => {
      const exactNow = new Date();
      const deactivatedPlan = { ...mockPlanPlus, isActive: false };

      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_exact_expiry_deactivated',
        userId: customer1.id,
        planId: deactivatedPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(exactNow.getTime() - 365 * 86400000),
        expiresAt: exactNow, // Exact boundary: expiresAt <= now
        plan: deactivatedPlan,
      } as never);

      const res = await request(app)
        .get('/api/v1/memberships/my-subscription')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasActiveSubscription).toBe(false);
      expect(res.body.data.entitlements.tripPlanner).toBe(false);
    });
  });

  describe('Preferences, Cancellation, and History Isolation', () => {
    it('updates autoRenew preference and returns clear non-billing notice', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_1',
        userId: customer1.id,
        autoRenew: false,
        plan: mockPlanBasic,
      } as never);

      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        id: 'sub_1',
        userId: customer1.id,
        autoRenew: true,
        plan: mockPlanBasic,
      } as never);

      const res = await request(app)
        .patch('/api/v1/memberships/my-subscription')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ autoRenew: true });

      expect(res.status).toBe(200);
      expect(res.body.data.autoRenew).toBe(true);
      expect(res.body.data.autoRenewNotice).toContain('does not initiate automated charges');
    });

    it('cancels active subscription, revokes premium entitlements, and preserves history', async () => {
      const now = new Date();
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        id: 'sub_to_cancel',
        userId: customer1.id,
        status: SubscriptionStatus.ACTIVE,
        plan: mockPlanPlus,
      } as never);

      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        id: 'sub_to_cancel',
        userId: customer1.id,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: now,
        plan: mockPlanPlus,
      } as never);

      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/memberships/cancel')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Sold car' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.effectiveEntitlements.tripPlanner).toBe(false);
    });

    it('strictly isolates customer subscription history to authenticated customer', async () => {
      const findManySpy = vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          id: 'sub_cust2',
          userId: customer2.id,
          planId: mockPlanBasic.id,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 100 * 86400000),
          createdAt: new Date(),
          plan: mockPlanBasic,
        },
      ] as never);

      const res = await request(app)
        .get('/api/v1/memberships/history')
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('sub_cust2');
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: customer2.id }),
        }),
      );
    });
  });
});
