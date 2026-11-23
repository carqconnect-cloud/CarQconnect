import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/common/utils/jwt';
import { LeadStatus } from '@prisma/client';
import { adminCrmRepository } from '../src/modules/admin/crm/adminCrm.repository';

describe('Super Admin CRM Visibility Endpoints (/api/v1/admin/crm/*)', () => {
  const app = createApp();

  const superAdminToken = signAccessToken({
    sub: 'user_super_admin_1',
    email: 'super@fioner.test',
    isSuperAdmin: true,
  });

  const normalUserToken = signAccessToken({
    sub: 'user_regular_1',
    email: 'user@fioner.test',
    isSuperAdmin: false,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    // Default active super admin user lookup mock
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where?.id === 'user_super_admin_1') {
        return { isSuperAdmin: true, isActive: true } as any;
      }
      if (args.where?.id === 'user_regular_1') {
        return { isSuperAdmin: false, isActive: true } as any;
      }
      return null;
    });
  });

  describe('Authorization and Boundary Enforcement', () => {
    it('1. rejects unauthenticated access with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/crm/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('2. rejects non-super-admin user with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/crm/overview')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3. rejects deactivated super admin with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: false,
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/crm/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/crm/overview', () => {
    it('4. returns overview metrics with accurate conversion rate and lead funnel', async () => {
      vi.spyOn(adminCrmRepository, 'getOverviewStats').mockResolvedValueOnce({
        totalLeads: 25,
        wonLeads: 5,
        callsToday: 12,
        rawFunnel: [
          { status: LeadStatus.NEW, _count: { _all: 10 } },
          { status: LeadStatus.CONTACTED, _count: { _all: 5 } },
          { status: LeadStatus.WON, _count: { _all: 5 } },
          { status: LeadStatus.LOST, _count: { _all: 5 } },
        ] as any,
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalLeads).toBe(25);
      expect(res.body.data.wonLeads).toBe(5);
      expect(res.body.data.conversionRate).toBe(20); // 5 / 25 * 100 = 20%
      expect(res.body.data.callsToday).toBe(12);

      // Verify leadFunnel includes all 7 canonical statuses, zero-filled for missing
      expect(res.body.data.leadFunnel).toHaveLength(7);
      const funnelMap = Object.fromEntries(
        res.body.data.leadFunnel.map((item: any) => [item.status, item.count]),
      );
      expect(funnelMap.NEW).toBe(10);
      expect(funnelMap.CONTACTED).toBe(5);
      expect(funnelMap.QUALIFIED).toBe(0);
      expect(funnelMap.PROPOSAL).toBe(0);
      expect(funnelMap.NEGOTIATION).toBe(0);
      expect(funnelMap.WON).toBe(5);
      expect(funnelMap.LOST).toBe(5);
    });

    it('5. handles zero-lead condition safely without division-by-zero error', async () => {
      vi.spyOn(adminCrmRepository, 'getOverviewStats').mockResolvedValueOnce({
        totalLeads: 0,
        wonLeads: 0,
        callsToday: 0,
        rawFunnel: [],
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalLeads).toBe(0);
      expect(res.body.data.wonLeads).toBe(0);
      expect(res.body.data.conversionRate).toBe(0);
      expect(res.body.data.callsToday).toBe(0);
      expect(res.body.data.leadFunnel).toHaveLength(7);
      for (const item of res.body.data.leadFunnel) {
        expect(item.count).toBe(0);
      }
    });
  });

  describe('GET /api/v1/admin/crm/calls', () => {
    it('6. returns paginated call records with formatted customer name and relations', async () => {
      const mockCalls = [
        {
          id: 'call_1',
          organizationId: 'org_1',
          customerId: 'cust_1',
          leadId: null,
          type: 'AI',
          duration: 180,
          status: 'COMPLETED',
          notes: 'Customer inquired about pricing',
          recordingUrl: null,
          createdAt: new Date('2026-10-21T10:00:00Z'),
          updatedAt: new Date('2026-10-21T10:05:00Z'),
          customer: { id: 'cust_1', name: 'Aarav Sharma', phone: '9876543210' },
          lead: null,
          organization: { id: 'org_1', name: 'Fleet Logistics Ltd', slug: 'fleet-logistics' },
        },
        {
          id: 'call_2',
          organizationId: 'org_1',
          customerId: null,
          leadId: 'lead_1',
          type: 'HUMAN',
          duration: 90,
          status: 'MISSED',
          notes: null,
          recordingUrl: null,
          createdAt: new Date('2026-10-21T09:00:00Z'),
          updatedAt: new Date('2026-10-21T09:02:00Z'),
          customer: null,
          lead: { id: 'lead_1', name: 'Priya Patel', phone: '9123456789' },
          organization: { id: 'org_1', name: 'Fleet Logistics Ltd', slug: 'fleet-logistics' },
        },
      ];

      vi.spyOn(adminCrmRepository, 'listCalls').mockResolvedValueOnce({
        items: mockCalls as any,
        total: 2,
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/calls?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.pagination.total).toBe(2);
      expect(res.body.meta.pagination.page).toBe(1);

      // Verify formatted properties
      expect(res.body.data[0].customerName).toBe('Aarav Sharma');
      expect(res.body.data[0].type).toBe('AI');
      expect(res.body.data[0].agent).toBe('AI Agent');
      expect(res.body.data[0].durationSec).toBe(180);
      expect(res.body.data[0].outcome).toBe('COMPLETED');
      expect(res.body.data[0].organization.name).toBe('Fleet Logistics Ltd');

      expect(res.body.data[1].customerName).toBe('Priya Patel');
      expect(res.body.data[1].type).toBe('Human');
      expect(res.body.data[1].agent).toBe('Support Staff');
    });

    it('7. passes search and type filter to call query', async () => {
      const listSpy = vi.spyOn(adminCrmRepository, 'listCalls').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/calls?search=Aarav&type=AI')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Aarav',
          type: 'AI',
        }),
      );
    });

    it('8. rejects invalid call type filter with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/crm/calls?type=ROBOT')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/crm/leads', () => {
    it('9. returns paginated leads with stage, owner, and source', async () => {
      const mockLeads = [
        {
          id: 'lead_1',
          name: 'Rohan Verma',
          phone: '9988776655',
          email: 'rohan@example.com',
          company: 'Verma Transports',
          source: 'Website',
          status: LeadStatus.CONTACTED,
          value: 125000,
          ownerId: 'user_agent_1',
          convertedAt: null,
          createdAt: new Date('2026-10-20T12:00:00Z'),
          customer: null,
          organization: { id: 'org_1', name: 'Fast Track Logistics', slug: 'fast-track' },
        },
      ];

      vi.spyOn(adminCrmRepository, 'listLeads').mockResolvedValueOnce({
        items: mockLeads as any,
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/leads?page=1&limit=20')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Rohan Verma');
      expect(res.body.data[0].phone).toBe('9988776655');
      expect(res.body.data[0].stage).toBe('CONTACTED');
      expect(res.body.data[0].source).toBe('Website');
      expect(res.body.data[0].owner).toBe('user_agent_1');
      expect(res.body.data[0].organization.name).toBe('Fast Track Logistics');
    });

    it('10. passes search and status filters to lead query', async () => {
      const listSpy = vi.spyOn(adminCrmRepository, 'listLeads').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/leads?search=Rohan&status=CONTACTED')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Rohan',
          status: LeadStatus.CONTACTED,
        }),
      );
    });

    it('11. supports pagination beyond former 100-record boundary with accurate metadata', async () => {
      const mockLeads = Array.from({ length: 10 }, (_, i) => ({
        id: `lead_${101 + i}`,
        name: `Lead ${101 + i}`,
        phone: `9876543${101 + i}`,
        email: `lead${101 + i}@example.com`,
        company: `Company ${101 + i}`,
        source: 'Website',
        status: LeadStatus.NEW,
        value: 50000,
        ownerId: 'user_agent_1',
        convertedAt: null,
        createdAt: new Date('2026-10-21T06:00:00Z'),
        customer: null,
        organization: { id: 'org_1', name: 'Fast Track Logistics', slug: 'fast-track' },
      }));

      const listSpy = vi.spyOn(adminCrmRepository, 'listLeads').mockResolvedValueOnce({
        items: mockLeads as any,
        total: 250,
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/leads?page=11&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.data[0].id).toBe('lead_101');
      expect(res.body.meta.pagination.page).toBe(11);
      expect(res.body.meta.pagination.limit).toBe(10);
      expect(res.body.meta.pagination.total).toBe(250);
      expect(res.body.meta.pagination.totalPages).toBe(25);
      expect(res.body.meta.pagination.hasNextPage).toBe(true);
      expect(res.body.meta.pagination.hasPreviousPage).toBe(true);

      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100,
          take: 10,
        }),
      );
    });

    it('12. handles empty search query string safely without validation error', async () => {
      vi.spyOn(adminCrmRepository, 'listCalls').mockResolvedValueOnce({
        items: [],
        total: 0,
      });
      vi.spyOn(adminCrmRepository, 'listLeads').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const callsRes = await request(app)
        .get('/api/v1/admin/crm/calls?search=')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(callsRes.status).toBe(200);
      expect(callsRes.body.success).toBe(true);

      const leadsRes = await request(app)
        .get('/api/v1/admin/crm/leads?search=')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(leadsRes.status).toBe(200);
      expect(leadsRes.body.success).toBe(true);
    });

    it('13. handles out-of-range page safely returning empty items and accurate total', async () => {
      vi.spyOn(adminCrmRepository, 'listLeads').mockResolvedValueOnce({
        items: [],
        total: 15,
      });

      const res = await request(app)
        .get('/api/v1/admin/crm/leads?page=999&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.pagination.total).toBe(15);
      expect(res.body.meta.pagination.page).toBe(999);
      expect(res.body.meta.pagination.totalPages).toBe(2);
      expect(res.body.meta.pagination.hasNextPage).toBe(false);
      expect(res.body.meta.pagination.hasPreviousPage).toBe(true);
    });

    it('14. builds repository search query with phone, company, email, and notes', async () => {
      const callsSpy = vi.spyOn(prisma.callRecord, 'findMany').mockResolvedValueOnce([]);
      vi.spyOn(prisma.callRecord, 'count').mockResolvedValueOnce(0);

      await adminCrmRepository.listCalls({
        skip: 0,
        take: 10,
        search: '987654',
      });

      expect(callsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { customer: { name: { contains: '987654', mode: 'insensitive' } } },
              { customer: { phone: { contains: '987654', mode: 'insensitive' } } },
              { lead: { name: { contains: '987654', mode: 'insensitive' } } },
              { lead: { phone: { contains: '987654', mode: 'insensitive' } } },
              { notes: { contains: '987654', mode: 'insensitive' } },
            ]),
          }),
        }),
      );

      const leadsSpy = vi.spyOn(prisma.lead, 'findMany').mockResolvedValueOnce([]);
      vi.spyOn(prisma.lead, 'count').mockResolvedValueOnce(0);

      await adminCrmRepository.listLeads({
        skip: 0,
        take: 10,
        search: 'corp@fioner.test',
      });

      expect(leadsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'corp@fioner.test', mode: 'insensitive' } },
              { phone: { contains: 'corp@fioner.test', mode: 'insensitive' } },
              { email: { contains: 'corp@fioner.test', mode: 'insensitive' } },
              { company: { contains: 'corp@fioner.test', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('15. verifies deterministic sorting with unique id tie-breaker', async () => {
      const callsSpy = vi.spyOn(prisma.callRecord, 'findMany').mockResolvedValueOnce([]);
      vi.spyOn(prisma.callRecord, 'count').mockResolvedValueOnce(0);

      await adminCrmRepository.listCalls({
        skip: 0,
        take: 10,
      });

      expect(callsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );

      const leadsSpy = vi.spyOn(prisma.lead, 'findMany').mockResolvedValueOnce([]);
      vi.spyOn(prisma.lead, 'count').mockResolvedValueOnce(0);

      await adminCrmRepository.listLeads({
        skip: 0,
        take: 10,
      });

      expect(leadsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });
  });
});
