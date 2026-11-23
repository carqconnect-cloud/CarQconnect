import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminDashboardRepository } from '../src/modules/admin/dashboard/adminDashboard.repository';

describe('Super Admin Dashboard Endpoints (/api/v1/admin/dashboard/*)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'user_super_admin_dash_test_1',
    email: 'superadmin_dash@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: 'user_regular_dash_test_1',
    email: 'regular_dash@fioner.test',
    isSuperAdmin: false,
  });

  const mockExecutiveData = {
    users: {
      total: 15,
      active: 12,
      inactive: 3,
      superAdmins: 2,
      newInPeriod: 5,
      newPrevPeriod: 4,
    },
    organizations: {
      total: 6,
      active: 5,
      inactive: 1,
      newInPeriod: 2,
      newPrevPeriod: 1,
    },
    memberships: {
      total: 20,
      active: 18,
      byRole: [
        { role: 'OWNER', count: 6 },
        { role: 'ADMIN', count: 4 },
        { role: 'TEAM_HEAD', count: 2 },
        { role: 'EXECUTIVE', count: 6 },
        { role: 'VIEWER', count: 2 },
      ],
    },
    audit: {
      totalLogs: 120,
      logsInPeriod: 45,
      recent: [
        {
          id: 'log_1',
          action: 'admin.user_deactivated',
          entity: 'User',
          entityId: 'target_1',
          createdAt: new Date('2026-10-10T12:00:00Z'),
          actor: { id: 'admin_1', email: 'admin@fioner.test', firstName: 'Super', lastName: 'Admin' },
          organization: null,
        },
      ],
    },
    crm: {
      totalCustomers: 8,
      totalLeads: 25,
      wonDealValue: 150000,
      leadsByStatus: [
        { status: 'NEW', count: 10 },
        { status: 'WON', count: 5 },
      ],
    },
    sos: {
      total: 10,
      active: 3,
      pending: 1,
      acknowledged: 1,
      escalated: 1,
      resolved: 7,
      recent: [],
    },
    vehicles: {
      total: 15,
    },
    subscriptions: {
      total: 42,
      active: 35,
    },
    totalSubscriptions: 42,
    activeSubscriptions: 35,
    qrCodes: {
      total: 100,
      active: 80,
    },
    orders: {
      total: 50,
      paid: 45,
      revenue: 99000,
    },
  };

  const mockAlertsData = {
    deactivatedOrgs: [
      { id: 'org_inact_1', name: 'Suspended Fleet', slug: 'suspended-fleet', updatedAt: new Date('2026-10-09T10:00:00Z') },
    ],
    deactivatedUsers: [
      { id: 'usr_inact_1', email: 'banned@fioner.test', firstName: 'Bad', lastName: 'User', updatedAt: new Date('2026-10-08T09:00:00Z') },
    ],
    criticalAuditEvents: [
      {
        id: 'crit_1',
        action: 'admin.organization_deactivated',
        entity: 'Organization',
        entityId: 'org_inact_1',
        createdAt: new Date('2026-10-09T10:00:00Z'),
        actor: { id: 'admin_1', email: 'superadmin@fioner.test' },
      },
    ],
    activeSosEvents: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: superAdminUser.id,
      email: superAdminUser.email,
      isSuperAdmin: true,
      isActive: true,
    } as never);
  });

  describe('Authorization & Security Boundary', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-Super-Admin users with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'user_regular_dash_test_1',
        email: 'regular_dash@fioner.test',
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects deactivated Super Admin accounts with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: superAdminUser.id,
        email: superAdminUser.email,
        isSuperAdmin: true,
        isActive: false,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows active Super Admin without organization membership or X-Organization-Id', async () => {
      vi.spyOn(adminDashboardRepository, 'getExecutiveOverview').mockResolvedValueOnce(mockExecutiveData as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.users.total).toBe(15);
    });
  });

  describe('Executive Dashboard (GET /admin/dashboard & /admin/dashboard/executive)', () => {
    it('returns executive overview with metrics, growth rates, and unimplemented domains notice', async () => {
      vi.spyOn(adminDashboardRepository, 'getExecutiveOverview').mockResolvedValueOnce(mockExecutiveData as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard/executive')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { metrics, dateRange, unimplementedDomains } = res.body.data;
      expect(dateRange.start).toBeDefined();
      expect(dateRange.end).toBeDefined();

      // Users metrics
      expect(metrics.users.total).toBe(15);
      expect(metrics.users.active).toBe(12);
      expect(metrics.users.inactive).toBe(3);
      expect(metrics.users.growthRate).toBe(25.0); // (5-4)/4 * 100 = 25%

      // Organizations metrics
      expect(metrics.organizations.total).toBe(6);
      expect(metrics.organizations.growthRate).toBe(100.0); // (2-1)/1 * 100 = 100%

      // Memberships & CRM
      expect(metrics.memberships.total).toBe(20);
      expect(metrics.memberships.active).toBe(18);
      expect(metrics.memberships.byRole).toHaveLength(5);
      expect(metrics.crm.totalCustomers).toBe(8);
      expect(metrics.crm.wonDealValue).toBe(150000);

      // SOS metrics
      expect(metrics.sos.total).toBe(10);
      expect(metrics.sos.active).toBe(3);
      expect(metrics.sos.pending).toBe(1);
      expect(metrics.sos.acknowledged).toBe(1);
      expect(metrics.sos.escalated).toBe(1);
      expect(metrics.sos.resolved).toBe(7);

      // Vehicles metrics
      expect(metrics.vehicles.total).toBe(15);

      // Phase 3E.3 Consumer Subscription metrics
      expect(metrics.totalSubscriptions).toBe(42);
      expect(metrics.activeSubscriptions).toBe(35);

      // QR codes metrics
      expect(metrics.qrCodes.total).toBe(100);
      expect(metrics.qrCodes.active).toBe(80);
      expect(metrics.activeQrCodes).toBe(80);

      // Orders & revenue metrics
      expect(metrics.orders.total).toBe(50);
      expect(metrics.orders.paid).toBe(45);
      expect(metrics.orders.revenue).toBe(99000);
      expect(metrics.totalOrders).toBe(50);
      expect(metrics.totalRevenue).toBe(99000);

      // Unimplemented / Built domains notice
      expect(unimplementedDomains.vehicles).toBeUndefined();
      expect(unimplementedDomains.qrCodes.status).toBe('BUILT');
      expect(unimplementedDomains.orders.status).toBe('BUILT');
      expect(unimplementedDomains.sosIncidents).toBeUndefined();
    });

    it('handles empty membership datasets safely without errors', async () => {
      vi.spyOn(adminDashboardRepository, 'getExecutiveOverview').mockResolvedValueOnce({
        ...mockExecutiveData,
        memberships: {
          total: 0,
          active: 0,
          byRole: [],
        },
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.memberships.total).toBe(0);
      expect(res.body.data.metrics.memberships.active).toBe(0);
      expect(res.body.data.metrics.memberships.byRole).toEqual([]);
    });

    it('supports period query parameter (today, last7days, thismonth, thisyear)', async () => {
      const repoSpy = vi.spyOn(adminDashboardRepository, 'getExecutiveOverview').mockResolvedValue(mockExecutiveData as never);

      const res7Days = await request(app)
        .get('/api/v1/admin/dashboard?period=last7days')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res7Days.status).toBe(200);
      expect(res7Days.body.data.period).toBe('last7days');
      expect(repoSpy).toHaveBeenCalled();
    });

    it('rejects invalid period with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?period=invalid_period')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects malformed startDate with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?startDate=not-a-valid-date')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects reversed date range (startDate > endDate) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?startDate=2026-10-15T00:00:00.000Z&endDate=2026-10-10T00:00:00.000Z')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects incomplete custom date range (only startDate without endDate) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?startDate=2026-10-01T00:00:00.000Z')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects incomplete custom date range (only endDate without startDate) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?endDate=2026-10-10T00:00:00.000Z')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts valid custom date range (startDate <= endDate)', async () => {
      vi.spyOn(adminDashboardRepository, 'getExecutiveOverview').mockResolvedValueOnce(mockExecutiveData as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard?startDate=2026-10-01T00:00:00.000Z&endDate=2026-10-10T00:00:00.000Z')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dateRange.start).toBe('2026-10-01T00:00:00.000Z');
      expect(res.body.data.dateRange.end).toBe('2026-10-10T00:00:00.000Z');
    });
  });

  describe('Operational Alerts (GET /admin/dashboard/alerts)', () => {
    it('returns operational alerts and counts by severity', async () => {
      vi.spyOn(adminDashboardRepository, 'getOperationalAlerts').mockResolvedValueOnce(mockAlertsData as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard/alerts')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { alerts, counts } = res.body.data;
      expect(alerts).toHaveLength(3);
      expect(counts.total).toBe(3);
      expect(counts.filtered).toBe(3);
      expect(counts.bySeverity.warning).toBe(2); // org deactivated + critical audit
      expect(counts.bySeverity.info).toBe(1); // user deactivated
      expect(counts.bySeverity.danger).toBe(0);

      interface AlertResponseItem {
        id: string;
        type: string;
        severity: string;
        title: string;
      }
      const orgAlert = alerts.find((a: AlertResponseItem) => a.type === 'ORGANIZATION_DEACTIVATED');
      expect(orgAlert).toBeDefined();
      expect(orgAlert.severity).toBe('warning');
      expect(orgAlert.title).toContain('Suspended Fleet');
    });

    it('filters alerts by severity accurately and updates counts.filtered', async () => {
      vi.spyOn(adminDashboardRepository, 'getOperationalAlerts').mockResolvedValueOnce(mockAlertsData as never);

      const res = await request(app)
        .get('/api/v1/admin/dashboard/alerts?severity=warning')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const { alerts, counts } = res.body.data;
      expect(alerts).toHaveLength(2);
      expect(counts.total).toBe(3);
      expect(counts.filtered).toBe(2);
      for (const alert of alerts) {
        expect(alert.severity).toBe('warning');
      }
    });

    it('rejects invalid severity with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/alerts?severity=catastrophic')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('System & Integration Health (GET /admin/dashboard/system-health)', () => {
    it('returns healthy status when database is connected', async () => {
      vi.spyOn(adminDashboardRepository, 'checkDatabaseHealth').mockResolvedValueOnce({
        isHealthy: true,
        latencyMs: 3,
      });

      const res = await request(app)
        .get('/api/v1/admin/dashboard/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.services.database.status).toBe('connected');
      expect(res.body.data.services.database.latencyMs).toBe(3);
      expect(res.body.data.integrations).toBeInstanceOf(Array);
    });

    it('returns degraded status when database is disconnected', async () => {
      vi.spyOn(adminDashboardRepository, 'checkDatabaseHealth').mockResolvedValueOnce({
        isHealthy: false,
        latencyMs: -1,
      });

      const res = await request(app)
        .get('/api/v1/admin/dashboard/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('degraded');
      expect(res.body.data.services.database.status).toBe('disconnected');
    });

    it('verifies integration statuses distinguish verified live from pending configuration when unconfigured', async () => {
      vi.spyOn(adminDashboardRepository, 'checkDatabaseHealth').mockResolvedValueOnce({
        isHealthy: true,
        latencyMs: 5,
      });

      const res = await request(app)
        .get('/api/v1/admin/dashboard/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      interface IntegrationItem { id: string; status: string; configured: boolean; verifiedLive: boolean; }
      const dbInt = res.body.data.integrations.find((i: IntegrationItem) => i.id === 'database');
      expect(dbInt).toBeDefined();
      expect(dbInt.configured).toBe(true);
      expect(dbInt.verifiedLive).toBe(true);
      expect(dbInt.status).toBe('connected');

      const externalInts = res.body.data.integrations.filter((i: IntegrationItem) => i.id !== 'database');
      for (const ext of externalInts) {
        expect(ext.verifiedLive).toBe(false);
        expect(ext.configured).toBe(false);
        expect(ext.status).toBe('pending_configuration');
      }
    });

    it('reliably marks configured external integrations as configured without falsely claiming verified live connectivity', async () => {
      vi.spyOn(adminDashboardRepository, 'checkDatabaseHealth').mockResolvedValueOnce({
        isHealthy: true,
        latencyMs: 4,
      });

      const originalRedis = process.env.REDIS_URL;
      const originalRzpId = process.env.RAZORPAY_KEY_ID;
      const originalRzpSecret = process.env.RAZORPAY_KEY_SECRET;

      try {
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.RAZORPAY_KEY_ID = 'rzp_test_sample_key';
        process.env.RAZORPAY_KEY_SECRET = 'sample_secret_key';

        const res = await request(app)
          .get('/api/v1/admin/dashboard/system-health')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        interface IntegrationItem { id: string; status: string; configured: boolean; verifiedLive: boolean; }
        const redisInt = res.body.data.integrations.find((i: IntegrationItem) => i.id === 'redis');
        expect(redisInt).toBeDefined();
        expect(redisInt.configured).toBe(true);
        expect(redisInt.status).toBe('configured');
        expect(redisInt.verifiedLive).toBe(false); // CRITICAL: Never infer live connectivity from env presence

        const rzpInt = res.body.data.integrations.find((i: IntegrationItem) => i.id === 'razorpay');
        expect(rzpInt).toBeDefined();
        expect(rzpInt.configured).toBe(true);
        expect(rzpInt.status).toBe('configured');
        expect(rzpInt.verifiedLive).toBe(false);
      } finally {
        if (originalRedis === undefined) delete process.env.REDIS_URL;
        else process.env.REDIS_URL = originalRedis;

        if (originalRzpId === undefined) delete process.env.RAZORPAY_KEY_ID;
        else process.env.RAZORPAY_KEY_ID = originalRzpId;

        if (originalRzpSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
        else process.env.RAZORPAY_KEY_SECRET = originalRzpSecret;
      }
    });

    it('safely handles incomplete configuration without exposing secrets or claiming configured status', async () => {
      vi.spyOn(adminDashboardRepository, 'checkDatabaseHealth').mockResolvedValueOnce({
        isHealthy: true,
        latencyMs: 4,
      });

      const originalRzpId = process.env.RAZORPAY_KEY_ID;
      const originalRzpSecret = process.env.RAZORPAY_KEY_SECRET;

      try {
        // Only set key ID without secret
        process.env.RAZORPAY_KEY_ID = 'rzp_test_sample_key';
        delete process.env.RAZORPAY_KEY_SECRET;

        const res = await request(app)
          .get('/api/v1/admin/dashboard/system-health')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        interface IntegrationItem { id: string; status: string; configured: boolean; verifiedLive: boolean; }
        const rzpInt = res.body.data.integrations.find((i: IntegrationItem) => i.id === 'razorpay');
        expect(rzpInt).toBeDefined();
        expect(rzpInt.configured).toBe(false);
        expect(rzpInt.status).toBe('pending_configuration');
        expect(rzpInt.verifiedLive).toBe(false);
      } finally {
        if (originalRzpId === undefined) delete process.env.RAZORPAY_KEY_ID;
        else process.env.RAZORPAY_KEY_ID = originalRzpId;

        if (originalRzpSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
        else process.env.RAZORPAY_KEY_SECRET = originalRzpSecret;
      }
    });
  });
});
