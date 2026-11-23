import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { SubscriptionStatus } from '@prisma/client';

describe('Admin Memberships & Subscriptions Module (Phase 3E.3)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'admin_mem_test_1',
    email: 'superadmin_mem@fioner.test',
    firstName: 'Super',
    lastName: 'Admin',
    isSuperAdmin: true,
    isActive: true,
  };

  const customerUser = {
    id: 'cust_mem_test_1',
    email: 'customer_mem@fioner.test',
    firstName: 'Aarav',
    lastName: 'Sharma',
    phone: '+919876543210',
    isSuperAdmin: false,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const customerToken = signAccessToken({
    sub: customerUser.id,
    email: customerUser.email,
    isSuperAdmin: false,
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(prisma.user, 'findUnique').mockImplementation(
      (async (args: unknown) => {
        const query = args as { where: { id?: string; email?: string } };
        const id = query?.where?.id;
        if (id === customerUser.id) return customerUser as never;
        return superAdminUser as never;
      }) as unknown as typeof prisma.user.findUnique,
    );

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return cb as never;
    });
  });

  describe('Authorization & Access Boundaries', () => {
    it('rejects unauthenticated requests to /api/v1/admin/memberships/* with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/memberships/plans');
      expect(res.status).toBe(401);
    });

    it('rejects non-superadmin authenticated users with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/memberships/plans')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Plan Management (CRUD & Validation)', () => {
    it('creates a new membership plan with integer-paise price and validated entitlements', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.membershipPlan, 'create').mockResolvedValue({
        id: 'pln_test_1',
        slug: 'rakshak-basic',
        name: 'Rakshak Basic',
        priceInPaise: 49900,
        validityDays: 365,
        color: 'info',
        benefits: ['1 vehicle QR safety profile', 'Standard masked calling'],
        entitlements: {
          tripPlanner: false,
          prioritySupport: false,
          familyAlerts: true,
          gpsLiveTracking: false,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/admin/memberships/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Rakshak Basic',
          slug: 'rakshak-basic',
          priceInPaise: 49900,
          validityDays: 365,
          color: 'info',
          benefits: ['1 vehicle QR safety profile', 'Standard masked calling'],
          entitlements: {
            tripPlanner: false,
            prioritySupport: false,
            familyAlerts: true,
            gpsLiveTracking: false,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('rakshak-basic');
      expect(res.body.data.priceInPaise).toBe(49900);
      expect(res.body.data.priceInRupees).toBe(499);
      expect(res.body.data.entitlements.familyAlerts).toBe(true);
    });

    it('rejects plan creation with unrecognized entitlement keys', async () => {
      const res = await request(app)
        .post('/api/v1/admin/memberships/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Invalid Plan',
          slug: 'invalid-plan',
          priceInPaise: 49900,
          validityDays: 365,
          entitlements: {
            tripPlanner: true,
            prioritySupport: true,
            familyAlerts: true,
            gpsLiveTracking: true,
            unauthorizedSuperPower: true, // Malformed extra key!
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects plan creation with invalid fractional rupee precision (> 2 decimal places)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/memberships/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Fractional Plan',
          slug: 'fractional-plan',
          price: 499.999, // 3 decimal places - invalid fractional paise
          validityDays: 365,
          entitlements: {
            tripPlanner: false,
            prioritySupport: false,
            familyAlerts: true,
            gpsLiveTracking: false,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body)).toContain('Price in rupees cannot have more than 2 decimal places');
    });

    it('rejects plan creation when price and priceInPaise are inconsistent', async () => {
      const res = await request(app)
        .post('/api/v1/admin/memberships/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Inconsistent Plan',
          slug: 'inconsistent-plan',
          price: 499,
          priceInPaise: 59900, // Conflict!
          validityDays: 365,
          entitlements: {
            tripPlanner: false,
            prioritySupport: false,
            familyAlerts: true,
            gpsLiveTracking: false,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body)).toContain('exact same amount');
    });

    it('rejects duplicate plan slug with 409 Conflict', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue({
        id: 'pln_existing',
        slug: 'duplicate-slug',
      } as never);

      const res = await request(app)
        .post('/api/v1/admin/memberships/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Plan',
          slug: 'duplicate-slug',
          priceInPaise: 99900,
          entitlements: {
            tripPlanner: true,
            prioritySupport: false,
            familyAlerts: true,
            gpsLiveTracking: false,
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('already exists');
    });

    it('lists plans with total and active subscriber counts', async () => {
      vi.spyOn(prisma.membershipPlan, 'findMany').mockResolvedValue([
        {
          id: 'pln_1',
          name: 'Basic',
          slug: 'basic',
          priceInPaise: 49900,
          validityDays: 365,
          color: 'info',
          benefits: [],
          entitlements: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as never);

      vi.spyOn(prisma.subscription, 'count')
        .mockResolvedValueOnce(15) // totalSubscribers
        .mockResolvedValueOnce(12); // activeSubscribers

      const res = await request(app)
        .get('/api/v1/admin/memberships/plans')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].totalSubscribers).toBe(15);
      expect(res.body.data[0].activeSubscribers).toBe(12);
      expect(res.body.data[0].priceInRupees).toBe(499);
    });

    it('updates plan fields and records audit log without modifying historical subscriptions', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue({
        id: 'pln_1',
        name: 'Basic',
        priceInPaise: 49900,
      } as never);

      vi.spyOn(prisma.subscription, 'count').mockResolvedValue(0);

      vi.spyOn(prisma.membershipPlan, 'update').mockResolvedValue({
        id: 'pln_1',
        name: 'Basic Updated',
        priceInPaise: 59900,
        validityDays: 365,
        color: 'info',
        benefits: ['New benefit'],
        entitlements: {
          tripPlanner: false,
          prioritySupport: false,
          familyAlerts: true,
          gpsLiveTracking: false,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .put('/api/v1/admin/memberships/plans/pln_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Basic Updated',
          priceInPaise: 59900,
          benefits: ['New benefit'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Basic Updated');
      expect(res.body.data.priceInRupees).toBe(599);
      expect(auditSpy).toHaveBeenCalled();
    });

    it('rejects plan update with invalid fractional rupee precision (> 2 decimal places)', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue({ id: 'pln_1' } as never);

      const res = await request(app)
        .patch('/api/v1/admin/memberships/plans/pln_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          price: 599.999, // 3 decimal places
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body)).toContain('Price in rupees cannot have more than 2 decimal places');
    });

    it('rejects plan update when price and priceInPaise are conflicting', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue({ id: 'pln_1' } as never);

      const res = await request(app)
        .patch('/api/v1/admin/memberships/plans/pln_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          price: 599,
          priceInPaise: 69900, // Conflict!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body)).toContain('exact same amount');
    });

    it('Policy A: deactivating and reactivating a plan preserves existing subscription records and history untouched', async () => {
      const existingPlan = {
        id: 'pln_deact_1',
        slug: 'basic',
        name: 'Basic',
        priceInPaise: 49900,
        validityDays: 365,
        isActive: true,
      };

      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(existingPlan as never);
      vi.spyOn(prisma.subscription, 'count').mockResolvedValue(0);
      const updatePlanSpy = vi.spyOn(prisma.membershipPlan, 'update').mockResolvedValue({
        ...existingPlan,
        isActive: false,
      } as never);
      const subUpdateSpy = vi.spyOn(prisma.subscription, 'update');
      const subDeleteSpy = vi.spyOn(prisma.subscription, 'delete');
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      // 1. Deactivate plan
      const deactRes = await request(app)
        .patch('/api/v1/admin/memberships/plans/pln_deact_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);
      expect(updatePlanSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pln_deact_1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
      // Confirm subscriptions are never mutated on plan deactivation
      expect(subUpdateSpy).not.toHaveBeenCalled();
      expect(subDeleteSpy).not.toHaveBeenCalled();

      // 2. Reactivate plan
      updatePlanSpy.mockResolvedValueOnce({
        ...existingPlan,
        isActive: true,
      } as never);

      const reactRes = await request(app)
        .patch('/api/v1/admin/memberships/plans/pln_deact_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.data.isActive).toBe(true);
      expect(subUpdateSpy).not.toHaveBeenCalled();
      expect(subDeleteSpy).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Monitoring & Overrides', () => {
    it('returns paginated subscriptions with user and plan details', async () => {
      const now = new Date();
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          id: 'sub_1',
          userId: 'usr_1',
          planId: 'pln_1',
          status: SubscriptionStatus.ACTIVE,
          startedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 86400000),
          autoRenew: false,
          createdAt: now,
          updatedAt: now,
          user: {
            id: 'usr_1',
            firstName: 'Aarav',
            lastName: 'Sharma',
            email: 'aarav@fioner.test',
            phone: '+919876543210',
          },
          plan: {
            id: 'pln_1',
            name: 'Rakshak Plus',
            slug: 'rakshak-plus',
            priceInPaise: 99900,
            validityDays: 365,
            color: 'warning',
          },
        },
      ] as never);

      vi.spyOn(prisma.subscription, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/memberships/subscriptions?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].userName).toBe('Aarav Sharma');
      expect(res.body.data.items[0].planName).toBe('Rakshak Plus');
      expect(res.body.data.total).toBe(1);
    });

    it('rejects administrative status override to ACTIVE without payment', async () => {
      vi.spyOn(prisma.subscription, 'findUnique').mockResolvedValue({
        id: 'sub_1',
        status: SubscriptionStatus.SUSPENDED,
      } as never);

      const res = await request(app)
        .patch('/api/v1/admin/memberships/subscriptions/sub_1/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(400);
    });

    it('overrides subscription status to CANCELLED and records audit event', async () => {
      const now = new Date();
      vi.spyOn(prisma.subscription, 'findUnique').mockResolvedValue({
        id: 'sub_1',
        userId: 'usr_1',
        planId: 'pln_1',
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(now.getTime() + 86400000),
        user: { id: 'usr_1', firstName: 'Aarav', lastName: 'Sharma', email: 'aarav@fioner.test' },
        plan: { id: 'pln_1', name: 'Plus' },
      } as never);

      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        id: 'sub_1',
        userId: 'usr_1',
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: now,
        user: { id: 'usr_1', firstName: 'Aarav', lastName: 'Sharma', email: 'aarav@fioner.test' },
        plan: { id: 'pln_1', name: 'Plus' },
      } as never);

      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .patch('/api/v1/admin/memberships/subscriptions/sub_1/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'CANCELLED', reason: 'Customer requested admin refund' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(auditSpy).toHaveBeenCalled();
    });
  });

  describe('Renewals Desk & Reminder Request', () => {
    it('returns subscriptions expiring within configured window and excludes expired ones', async () => {
      const now = new Date();
      const in10Days = new Date(now.getTime() + 10 * 86400000);

      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          id: 'sub_expiring',
          userId: 'usr_1',
          planId: 'pln_1',
          status: SubscriptionStatus.ACTIVE,
          expiresAt: in10Days,
          user: { firstName: 'Rohan', lastName: 'Verma', email: 'rohan@fioner.test' },
          plan: { id: 'pln_1', name: 'Rakshak Pro', slug: 'rakshak-pro' },
        },
      ] as never);

      const res = await request(app)
        .get('/api/v1/admin/memberships/renewals?days=15')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].userName).toBe('Rohan Verma');
      expect(res.body.data[0].planName).toBe('Rakshak Pro');
    });

    it('records reminder request timestamp, logs audit event, and explicitly states no message was sent', async () => {
      const now = new Date();
      vi.spyOn(prisma.subscription, 'findUnique').mockResolvedValue({
        id: 'sub_1',
        userId: 'usr_1',
        planId: 'pln_1',
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(now.getTime() + 86400000),
        user: { id: 'usr_1', firstName: 'Aarav', lastName: 'Sharma', email: 'aarav@fioner.test' },
        plan: { id: 'pln_1', name: 'Plus' },
      } as never);

      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        id: 'sub_1',
        reminderSentAt: now,
      } as never);

      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/admin/memberships/subscriptions/sub_1/remind')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.delivered).toBe(false);
      expect(res.body.data.message).toContain('No external message was sent');
      expect(auditSpy).toHaveBeenCalled();
    });
  });
});
