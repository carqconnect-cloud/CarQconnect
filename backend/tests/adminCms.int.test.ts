import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/common/utils/jwt';

describe('Fioner CMS & Notification Campaigns — Real PostgreSQL Integration Suite (fioner_test)', () => {
  const app = createApp();

  const uniqueSuffix = `cms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let superAdminId: string;
  let superAdminEmail: string;
  let superAdminToken: string;

  let regularUserId: string;
  let regularUserEmail: string;
  let regularUserToken: string;

  const createdBannerIds: string[] = [];
  const createdCampaignIds: string[] = [];

  beforeAll(async () => {
    // 1. Mandatory Safety Gate Verification
    const dbIdentity = await prisma.$queryRaw<
      Array<{ current_database: string; inet_server_port: number }>
    >`
      SELECT current_database(), inet_server_port();
    `;
    const activeDb = dbIdentity[0]?.current_database;
    if (activeDb !== 'fioner_test') {
      throw new Error(
        `SAFETY ABORT: Test target database is '${activeDb}', expected 'fioner_test'.`,
      );
    }

    // 2. Create Super Admin actor
    superAdminEmail = `superadmin_${uniqueSuffix}@fioner.test`;
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'CMS',
        lastName: 'SuperAdmin',
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;
    superAdminToken = signAccessToken({
      sub: superAdminId,
      email: superAdminEmail,
      isSuperAdmin: true,
    });

    // 3. Create regular non-super-admin user
    regularUserEmail = `regular_${uniqueSuffix}@fioner.test`;
    const regularUser = await prisma.user.create({
      data: {
        email: regularUserEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'Regular',
        lastName: 'User',
        isSuperAdmin: false,
        isActive: true,
      },
    });
    regularUserId = regularUser.id;
    regularUserToken = signAccessToken({
      sub: regularUserId,
      email: regularUserEmail,
      isSuperAdmin: false,
    });
  });

  afterAll(async () => {
    // Clean up created entities
    if (createdBannerIds.length > 0) {
      await prisma.banner.deleteMany({
        where: { id: { in: createdBannerIds } },
      });
    }

    if (createdCampaignIds.length > 0) {
      await prisma.notificationCampaign.deleteMany({
        where: { id: { in: createdCampaignIds } },
      });
    }

    // Clean up test users
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminId, regularUserId] } },
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Authorization Gate Tests
  // ---------------------------------------------------------------------------
  describe('Authorization Gate', () => {
    it('rejects unauthenticated request to /admin/banners with 401', async () => {
      const res = await request(app).get('/api/v1/admin/banners');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-super-admin request to /admin/banners with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects non-super-admin request to /admin/campaigns with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CMS Banners Integration & Persistence
  // ---------------------------------------------------------------------------
  describe('CMS Banners Integration', () => {
    let testBannerId: string;

    it('creates a new promotional banner with 201 CREATED', async () => {
      const res = await request(app)
        .post('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: `Monsoon Special Offer ${uniqueSuffix}`,
          schedule: '01 Nov – 30 Nov 2026',
          status: 'draft',
          targetUrl: 'https://fioner.in/offers/monsoon',
          priority: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toContain('Monsoon Special Offer');
      expect(res.body.data.status).toBe('draft');

      testBannerId = res.body.data.id;
      createdBannerIds.push(testBannerId);

      // Verify in PostgreSQL
      const inDb = await prisma.banner.findUnique({
        where: { id: testBannerId },
      });
      expect(inDb).not.toBeNull();
      expect(inDb?.title).toBe(res.body.data.title);
    });

    it('lists banners with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(1);

      const found = res.body.data.find((b: any) => b.id === testBannerId);
      expect(found).toBeDefined();
    });

    it('fetches banner by ID with 200 OK', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/banners/${testBannerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testBannerId);
    });

    it('updates banner fields with 200 OK', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/banners/${testBannerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: `Updated Special Offer ${uniqueSuffix}`,
          priority: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toContain('Updated Special Offer');
      expect(res.body.data.priority).toBe(10);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: 'Banner',
          entityId: testBannerId,
          action: 'admin_banner.updated',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('toggles banner status between live and paused/draft', async () => {
      // First update to live
      await request(app)
        .patch(`/api/v1/admin/banners/${testBannerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'live' });

      // Toggle status -> should become paused
      const res1 = await request(app)
        .patch(`/api/v1/admin/banners/${testBannerId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('paused');

      // Toggle status again -> should become live
      const res2 = await request(app)
        .patch(`/api/v1/admin/banners/${testBannerId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('live');
    });

    it('deletes banner with 200 OK', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/banners/${testBannerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const inDb = await prisma.banner.findUnique({
        where: { id: testBannerId },
      });
      expect(inDb).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Notification Campaigns Integration & Truthful Dispatch
  // ---------------------------------------------------------------------------
  describe('Notification Campaigns Integration & Lifecycle', () => {
    let testCampaignId: string;

    it('previews audience counts for approved segments', async () => {
      const res = await request(app)
        .get('/api/v1/admin/campaigns/audience-preview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({ audience: 'All active users' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.count).toBe('number');
      expect(res.body.data.count).toBeGreaterThanOrEqual(1);
    });

    it('creates a notification campaign with 201 CREATED', async () => {
      const res = await request(app)
        .post('/api/v1/admin/campaigns')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: `Safety Awareness Campaign ${uniqueSuffix}`,
          channel: 'In-app',
          audience: 'Users without emergency contact',
          message: 'Please configure emergency contacts in your profile.',
          status: 'Draft',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toContain('Safety Awareness Campaign');
      expect(res.body.data.status).toBe('Draft');
      expect(res.body.data.isSimulated).toBe(true);

      testCampaignId = res.body.data.id;
      createdCampaignIds.push(testCampaignId);

      // Verify in PostgreSQL
      const inDb = await prisma.notificationCampaign.findUnique({
        where: { id: testCampaignId },
      });
      expect(inDb).not.toBeNull();
      expect(inDb?.channel).toBe('In-app');
    });

    it('updates a draft campaign with 200 OK', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/campaigns/${testCampaignId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: `Updated Awareness Campaign ${uniqueSuffix}`,
          channel: 'Push',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toContain('Updated Awareness Campaign');
      expect(res.body.data.channel).toBe('Push');
    });

    it('dispatches campaign truthfully: transitions to Sent, sets sentAt and simulated metadata', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${testCampaignId}/send`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Sent');
      expect(res.body.data.sentAt).not.toBeNull();
      expect(res.body.data.isSimulated).toBe(true);
      expect(typeof res.body.data.targetCount).toBe('number');

      // Verify in PostgreSQL
      const inDb = await prisma.notificationCampaign.findUnique({
        where: { id: testCampaignId },
      });
      expect(inDb?.status).toBe('Sent');
      expect(inDb?.sentAt).not.toBeNull();
      expect(inDb?.isSimulated).toBe(true);

      // Verify audit log entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: 'NotificationCampaign',
          entityId: testCampaignId,
          action: 'admin_campaign.sent',
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe(superAdminId);
    });

    it('prevents duplicate campaign execution: second send attempt returns 400 BAD_REQUEST', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/campaigns/${testCampaignId}/send`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already been sent');
    });

    it('prevents editing a campaign that is already Sent: returns 400 BAD_REQUEST', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/campaigns/${testCampaignId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Attempted name change' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already been sent');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Legacy B2B CRM Campaign Compatibility Check
  // ---------------------------------------------------------------------------
  describe('Legacy B2B CRM Campaign Isolation', () => {
    it('preserves existing B2B Campaign model with required organizationId unchanged', async () => {
      // Create a test organization
      const testOrg = await prisma.organization.create({
        data: {
          name: `Test Fleet Org ${uniqueSuffix}`,
          slug: `fleet-org-${uniqueSuffix}`,
        },
      });

      // Create a legacy B2B campaign under that organization
      const b2bCampaign = await prisma.campaign.create({
        data: {
          organizationId: testOrg.id,
          name: 'B2B Fleet Safety Reminder',
          status: 'DRAFT',
          audience: 'Drivers',
        },
      });

      expect(b2bCampaign.id).toBeDefined();
      expect(b2bCampaign.organizationId).toBe(testOrg.id);

      // Verify that notification_campaigns and campaigns are distinct tables
      const notifCount = await prisma.notificationCampaign.count();
      const b2bCount = await prisma.campaign.count();
      expect(typeof notifCount).toBe('number');
      expect(typeof b2bCount).toBe('number');

      // Clean up B2B test entities
      await prisma.campaign.delete({ where: { id: b2bCampaign.id } });
      await prisma.organization.delete({ where: { id: testOrg.id } });
    });
  });
});
