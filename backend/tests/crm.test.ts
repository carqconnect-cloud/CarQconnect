import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/common/utils/jwt';
import { Role, LeadStatus, TeamStatus } from '@prisma/client';
import { leadService } from '../src/modules/crm/leads/lead.service';
import { customerService } from '../src/modules/crm/customers/customer.service';
import { teamService } from '../src/modules/crm/teams/team.service';
import { ApiError } from '../src/common/utils/apiError';
import { orgOf as dashboardOrgOf } from '../src/modules/crm/dashboard/dashboard.controller';

describe('CRM HTTP Endpoints (/api/v1/crm/*)', () => {
  const app = createApp();

  const orgId = 'org_crm_test_1';

  // Tokens for different membership roles
  const viewerToken = signAccessToken({
    sub: 'user_viewer',
    email: 'viewer@test.com',
    isSuperAdmin: false,
    organizationId: orgId,
  });

  const executiveToken = signAccessToken({
    sub: 'user_exec',
    email: 'exec@test.com',
    isSuperAdmin: false,
    organizationId: orgId,
  });

  const teamHeadToken = signAccessToken({
    sub: 'user_th',
    email: 'teamhead@test.com',
    isSuperAdmin: false,
    organizationId: orgId,
  });

  const adminToken = signAccessToken({
    sub: 'user_admin',
    email: 'admin@test.com',
    isSuperAdmin: false,
    organizationId: orgId,
  });

  const ownerToken = signAccessToken({
    sub: 'user_owner',
    email: 'owner@test.com',
    isSuperAdmin: false,
    organizationId: orgId,
  });

  const superAdminWithOrgToken = signAccessToken({
    sub: 'user_super_with_org',
    email: 'super_org@test.com',
    isSuperAdmin: true,
    organizationId: orgId,
  });

  const superAdminWithoutOrgToken = signAccessToken({
    sub: 'user_super_no_org',
    email: 'super_no_org@test.com',
    isSuperAdmin: true,
  });

  const standardUserWithoutOrgToken = signAccessToken({
    sub: 'user_standard_no_org',
    email: 'standard_no_org@test.com',
    isSuperAdmin: false,
  });

  const mockLead = {
    id: 'lead_123',
    organizationId: orgId,
    name: 'Acme Corp Deal',
    email: 'deal@acme.com',
    phone: '+919876543210',
    company: 'Acme Corp',
    source: 'WEBSITE',
    status: LeadStatus.NEW,
    value: 50000 as never,
    notes: 'Initial contact',
    ownerId: 'user_exec',
    convertedAt: null,
    customerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer = {
    id: 'cust_123',
    organizationId: orgId,
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '+919876543211',
    company: 'Sharma Logistics',
    address: '123 MG Road, Indore',
    metadata: { fleetSize: 5 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeam = {
    id: 'team_123',
    organizationId: orgId,
    name: 'North Region Sales',
    status: TeamStatus.ACTIVE,
    headId: 'user_th',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    // Default tenant resolver stub for all test tokens
    vi.spyOn(prisma.membership, 'findFirst').mockImplementation(((args?: { where?: { userId?: unknown; organizationId?: unknown } }) => {
      const userId = args?.where?.userId;
      const requestedOrgId = args?.where?.organizationId;
      if (!userId) return Promise.resolve(null);
      if (requestedOrgId && requestedOrgId !== orgId) return Promise.resolve(null);

      if (userId === 'user_viewer') {
        return Promise.resolve({ id: 'mem_v', organizationId: orgId, role: Role.VIEWER } as never);
      }
      if (userId === 'user_exec') {
        return Promise.resolve({ id: 'mem_e', organizationId: orgId, role: Role.EXECUTIVE } as never);
      }
      if (userId === 'user_th') {
        return Promise.resolve({ id: 'mem_th', organizationId: orgId, role: Role.TEAM_HEAD } as never);
      }
      if (userId === 'user_admin') {
        return Promise.resolve({ id: 'mem_a', organizationId: orgId, role: Role.ADMIN } as never);
      }
      if (userId === 'user_owner') {
        return Promise.resolve({ id: 'mem_o', organizationId: orgId, role: Role.OWNER } as never);
      }
      if (userId === 'user_super_with_org') {
        return Promise.resolve({ id: 'mem_s', organizationId: orgId, role: Role.ADMIN } as never);
      }
      return Promise.resolve(null);
    }) as never);
  });

  // =========================================================================
  // 1. CRM LEADS (/api/v1/crm/leads)
  // =========================================================================
  describe('CRM Leads (/api/v1/crm/leads)', () => {
    it('rejects unauthenticated GET /api/v1/crm/leads with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/crm/leads');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /api/v1/crm/leads missing tenant context with 403 TENANT_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${superAdminWithoutOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_REQUIRED');
    });

    it('returns 200 with list of leads and pagination meta for valid tenant member', async () => {
      vi.spyOn(leadService, 'list').mockResolvedValueOnce({
        items: [mockLead as never],
        meta: {
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });

      const res = await request(app)
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockLead.id);
      expect(res.body.meta.pagination.total).toBe(1);
    });

    it('returns 200 with stats breakdown on GET /api/v1/crm/leads/stats', async () => {
      vi.spyOn(leadService, 'stats').mockResolvedValueOnce([
        { status: 'NEW', count: 5 },
        { status: 'WON', count: 2 },
      ]);

      const res = await request(app)
        .get('/api/v1/crm/leads/stats')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([
        { status: 'NEW', count: 5 },
        { status: 'WON', count: 2 },
      ]);
    });

    it('returns 200 for existing lead on GET /api/v1/crm/leads/:id', async () => {
      vi.spyOn(leadService, 'getById').mockResolvedValueOnce(mockLead as never);

      const res = await request(app)
        .get(`/api/v1/crm/leads/${mockLead.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(mockLead.name);
    });

    it('returns 404 for non-existent lead on GET /api/v1/crm/leads/:id', async () => {
      vi.spyOn(leadService, 'getById').mockRejectedValueOnce(ApiError.notFound('Lead'));

      const res = await request(app)
        .get('/api/v1/crm/leads/nonexistent_id')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    // --- Role gating on POST /api/v1/crm/leads ---
    describe('POST /api/v1/crm/leads role gating (requires EXECUTIVE+)', () => {
      it('rejects VIEWER with 403 Forbidden', async () => {
        const res = await request(app)
          .post('/api/v1/crm/leads')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ name: 'New Deal' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Requires EXECUTIVE access or higher');
      });

      it('allows EXECUTIVE and returns 201 Created', async () => {
        vi.spyOn(leadService, 'create').mockResolvedValueOnce(mockLead as never);

        const res = await request(app)
          .post('/api/v1/crm/leads')
          .set('Authorization', `Bearer ${executiveToken}`)
          .send({ name: 'Acme Deal', company: 'Acme' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(mockLead.id);
      });

      it('allows TEAM_HEAD and higher roles with 201 Created', async () => {
        vi.spyOn(leadService, 'create').mockResolvedValueOnce(mockLead as never);

        const res = await request(app)
          .post('/api/v1/crm/leads')
          .set('Authorization', `Bearer ${teamHeadToken}`)
          .send({ name: 'Acme Deal' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('rejects invalid payload (empty name) with 400 VALIDATION_ERROR', async () => {
        const res = await request(app)
          .post('/api/v1/crm/leads')
          .set('Authorization', `Bearer ${executiveToken}`)
          .send({ name: '' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    // --- Role gating on PATCH /api/v1/crm/leads/:id ---
    describe('PATCH /api/v1/crm/leads/:id role gating (requires EXECUTIVE+)', () => {
      it('rejects VIEWER with 403 Forbidden', async () => {
        const res = await request(app)
          .patch(`/api/v1/crm/leads/${mockLead.id}`)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ name: 'Updated' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Requires EXECUTIVE access or higher');
      });

      it('allows EXECUTIVE and returns 200 OK with updated lead', async () => {
        vi.spyOn(leadService, 'update').mockResolvedValueOnce({
          ...mockLead,
          name: 'Updated Name',
        } as never);

        const res = await request(app)
          .patch(`/api/v1/crm/leads/${mockLead.id}`)
          .set('Authorization', `Bearer ${executiveToken}`)
          .send({ name: 'Updated Name' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Updated Name');
      });

      it('returns 404 when lead does not exist on PATCH', async () => {
        vi.spyOn(leadService, 'update').mockRejectedValueOnce(ApiError.notFound('Lead'));

        const res = await request(app)
          .patch('/api/v1/crm/leads/nonexistent_id')
          .set('Authorization', `Bearer ${executiveToken}`)
          .send({ name: 'Updated Name' });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NOT_FOUND');
      });
    });

    // --- Role gating on DELETE /api/v1/crm/leads/:id ---
    describe('DELETE /api/v1/crm/leads/:id role gating (requires TEAM_HEAD+)', () => {
      it('rejects VIEWER with 403 Forbidden', async () => {
        const res = await request(app)
          .delete(`/api/v1/crm/leads/${mockLead.id}`)
          .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Requires TEAM_HEAD access or higher');
      });

      it('rejects EXECUTIVE with 403 Forbidden', async () => {
        const res = await request(app)
          .delete(`/api/v1/crm/leads/${mockLead.id}`)
          .set('Authorization', `Bearer ${executiveToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Requires TEAM_HEAD access or higher');
      });

      it('allows TEAM_HEAD and returns 204 No Content', async () => {
        const removeSpy = vi.spyOn(leadService, 'remove').mockResolvedValueOnce(undefined);

        const res = await request(app)
          .delete(`/api/v1/crm/leads/${mockLead.id}`)
          .set('Authorization', `Bearer ${teamHeadToken}`);

        expect(res.status).toBe(204);
        expect(removeSpy).toHaveBeenCalledWith(orgId, mockLead.id, 'user_th', expect.any(String));
      });

      it('allows ADMIN and OWNER to delete leads with 204 No Content', async () => {
        vi.spyOn(leadService, 'remove').mockResolvedValue(undefined);

        const resAdmin = await request(app)
          .delete(`/api/v1/crm/leads/${mockLead.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(resAdmin.status).toBe(204);

        const resOwner = await request(app)
          .delete(`/api/v1/crm/leads/${mockLead.id}`)
          .set('Authorization', `Bearer ${ownerToken}`);
        expect(resOwner.status).toBe(204);
      });
    });
  });

  // =========================================================================
  // 2. CRM CUSTOMERS (/api/v1/crm/customers)
  // =========================================================================
  describe('CRM Customers (/api/v1/crm/customers)', () => {
    it('rejects unauthenticated GET /api/v1/crm/customers with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/crm/customers');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 200 with list of customers and pagination', async () => {
      vi.spyOn(customerService, 'list').mockResolvedValueOnce({
        items: [mockCustomer as never],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/crm/customers')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe(mockCustomer.name);
    });

    it('returns 200 for existing customer on GET /api/v1/crm/customers/:id', async () => {
      vi.spyOn(customerService, 'getById').mockResolvedValueOnce(mockCustomer as never);

      const res = await request(app)
        .get(`/api/v1/crm/customers/${mockCustomer.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(mockCustomer.name);
    });

    it('returns 404 for non-existent customer on GET /api/v1/crm/customers/:id', async () => {
      vi.spyOn(customerService, 'getById').mockRejectedValueOnce(ApiError.notFound('Customer not found'));

      const res = await request(app)
        .get('/api/v1/crm/customers/nonexistent_id')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('creates customer with optional metadata and returns 201 Created', async () => {
      vi.spyOn(customerService, 'create').mockResolvedValueOnce(mockCustomer as never);

      const res = await request(app)
        .post('/api/v1/crm/customers')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Priya Sharma',
          email: 'priya@example.com',
          metadata: { fleetSize: 5 },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(mockCustomer.name);
    });

    it('rejects customer creation with missing name with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/crm/customers')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ email: 'bad@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates customer and returns 200 OK on PATCH /api/v1/crm/customers/:id', async () => {
      vi.spyOn(customerService, 'update').mockResolvedValueOnce({
        ...mockCustomer,
        name: 'Priya S. Patel',
      } as never);

      const res = await request(app)
        .patch(`/api/v1/crm/customers/${mockCustomer.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Priya S. Patel' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Priya S. Patel');
    });

    it('deletes customer and returns 204 No Content on DELETE /api/v1/crm/customers/:id', async () => {
      const removeSpy = vi.spyOn(customerService, 'remove').mockResolvedValueOnce(undefined);

      const res = await request(app)
        .delete(`/api/v1/crm/customers/${mockCustomer.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(204);
      expect(removeSpy).toHaveBeenCalledWith(orgId, mockCustomer.id, 'user_viewer', expect.any(String));
    });
  });

  // =========================================================================
  // 3. CRM TEAMS (/api/v1/crm/teams)
  // =========================================================================
  describe('CRM Teams (/api/v1/crm/teams)', () => {
    it('rejects unauthenticated GET /api/v1/crm/teams with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/crm/teams');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 200 with list of teams and pagination', async () => {
      vi.spyOn(teamService, 'list').mockResolvedValueOnce({
        items: [mockTeam as never],
        meta: {
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });

      const res = await request(app)
        .get('/api/v1/crm/teams')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe(mockTeam.name);
    });

    it('returns 200 for existing team on GET /api/v1/crm/teams/:id', async () => {
      vi.spyOn(teamService, 'getById').mockResolvedValueOnce(mockTeam as never);

      const res = await request(app)
        .get(`/api/v1/crm/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(mockTeam.name);
    });

    it('returns 404 for non-existent team on GET /api/v1/crm/teams/:id', async () => {
      vi.spyOn(teamService, 'getById').mockRejectedValueOnce(ApiError.notFound('Team'));

      const res = await request(app)
        .get('/api/v1/crm/teams/nonexistent_id')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('creates team and returns 201 Created on POST /api/v1/crm/teams', async () => {
      vi.spyOn(teamService, 'create').mockResolvedValueOnce(mockTeam as never);

      const res = await request(app)
        .post('/api/v1/crm/teams')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'North Region Sales', headId: 'user_th' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(mockTeam.name);
    });

    it('rejects team creation with empty name with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/crm/teams')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates team on PATCH /api/v1/crm/teams/:id and returns 200 OK', async () => {
      vi.spyOn(teamService, 'update').mockResolvedValueOnce({
        ...mockTeam,
        name: 'Updated Region Sales',
      } as never);

      const res = await request(app)
        .patch(`/api/v1/crm/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Updated Region Sales' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Region Sales');
    });

    it('deletes team on DELETE /api/v1/crm/teams/:id and returns 204 No Content', async () => {
      const removeSpy = vi.spyOn(teamService, 'remove').mockResolvedValueOnce(undefined);

      const res = await request(app)
        .delete(`/api/v1/crm/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(204);
      expect(removeSpy).toHaveBeenCalledWith(orgId, mockTeam.id, 'user_viewer', expect.any(String));
    });
  });

  // =========================================================================
  // 4. CRM DASHBOARD (/api/v1/crm/dashboard)
  // =========================================================================
  describe('CRM Dashboard (/api/v1/crm/dashboard)', () => {
    it('rejects unauthenticated GET /api/v1/crm/dashboard/stats with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/crm/dashboard/stats');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /api/v1/crm/dashboard/stats missing tenant context with 403 TENANT_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/crm/dashboard/stats')
        .set('Authorization', `Bearer ${standardUserWithoutOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_REQUIRED');
    });

    it('rejects GET /api/v1/crm/dashboard/stats with unauthorized X-Organization-Id header with 403 TENANT_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/crm/dashboard/stats')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('X-Organization-Id', 'org_unauthorized_foreign');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_REQUIRED');
    });

    it('returns 200 with stats metrics on GET /api/v1/crm/dashboard/stats', async () => {
      vi.spyOn(prisma.lead, 'count').mockResolvedValue(10);
      vi.spyOn(prisma.customer, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.lead, 'groupBy').mockResolvedValue([
        { status: LeadStatus.NEW, _count: { _all: 6 } },
        { status: LeadStatus.WON, _count: { _all: 4 } },
      ] as never);
      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
      vi.spyOn(prisma.membership, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([{ metadata: { health: 100 } }] as never);

      const res = await request(app)
        .get('/api/v1/crm/dashboard/stats?filter=thismonth')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data.metrics.totalLeads).toBe(10);
      expect(res.body.data.metrics.totalCustomers).toBe(5);
      expect(res.body.data).toHaveProperty('leadsByStatus');
      expect(res.body.data).toHaveProperty('leadsChartData');
      expect(res.body.data).toHaveProperty('customersChartData');
    });

    it('returns 200 with notification feed on GET /api/v1/crm/dashboard/notifications', async () => {
      vi.spyOn(prisma.lead, 'findMany').mockResolvedValue([mockLead] as never);
      vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([mockCustomer] as never);

      const res = await request(app)
        .get('/api/v1/crm/dashboard/notifications')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 200 with operational report on GET /api/v1/crm/dashboard/report', async () => {
      vi.spyOn(prisma.customer, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.lead, 'count').mockResolvedValue(8);
      vi.spyOn(prisma.supportTicket, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.lead, 'groupBy').mockResolvedValue([] as never);
      vi.spyOn(prisma.callRecord, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([] as never);
      vi.spyOn(prisma.team, 'findMany').mockResolvedValue([] as never);
      vi.spyOn(prisma.lead, 'findMany').mockResolvedValue([
        { ...mockLead, status: LeadStatus.WON, value: 15000 as never },
      ] as never);

      const res = await request(app)
        .get('/api/v1/crm/dashboard/report')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('leadsBreakdown');
    });

    it('rejects unauthenticated GET /api/v1/crm/dashboard/notifications with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/crm/dashboard/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated GET /api/v1/crm/dashboard/report with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/crm/dashboard/report');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('proves stats queries are strictly scoped to req.tenant.organizationId and do not query any fallback', async () => {
      const leadCountSpy = vi.spyOn(prisma.lead, 'count').mockResolvedValue(10);
      const custCountSpy = vi.spyOn(prisma.customer, 'count').mockResolvedValue(5);
      const leadGroupSpy = vi.spyOn(prisma.lead, 'groupBy').mockResolvedValue([] as never);
      const rawSpy = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
      const memberSpy = vi.spyOn(prisma.membership, 'count').mockResolvedValue(5);
      const custFindSpy = vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/crm/dashboard/stats')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(rawSpy).toHaveBeenCalled();
      expect(leadCountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
      expect(custCountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
      expect(leadGroupSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
      expect(memberSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, status: 'ACTIVE' },
        }),
      );
      expect(custFindSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
    });

    it('proves notifications queries are strictly scoped to req.tenant.organizationId', async () => {
      const leadFindSpy = vi.spyOn(prisma.lead, 'findMany').mockResolvedValue([]);
      const custFindSpy = vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/crm/dashboard/notifications')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(leadFindSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
      expect(custFindSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
    });

    it('proves report queries are strictly scoped to req.tenant.organizationId', async () => {
      const custCountSpy = vi.spyOn(prisma.customer, 'count').mockResolvedValue(0);
      const leadCountSpy = vi.spyOn(prisma.lead, 'count').mockResolvedValue(0);
      const ticketCountSpy = vi.spyOn(prisma.supportTicket, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.lead, 'groupBy').mockResolvedValue([] as never);
      vi.spyOn(prisma.callRecord, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.team, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.lead, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/crm/dashboard/report')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(custCountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
      expect(leadCountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
      expect(ticketCountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
    });

    it('proves dashboard orgOf helper fails closed with 403 when req.tenant is missing', () => {
      expect(() => dashboardOrgOf({} as never)).toThrowError(/organization context required/i);
    });
  });

  // =========================================================================
  // 5. SUPER ADMIN & TENANT BOUNDARIES
  // =========================================================================
  describe('Super Admin and Tenant Boundaries on CRM routes', () => {
    it('rejects Super Admin calling /api/v1/crm/leads without active membership with 403 TENANT_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${superAdminWithoutOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_REQUIRED');
    });

    it('allows Super Admin with valid organization membership to access CRM leads (200 OK)', async () => {
      vi.spyOn(leadService, 'list').mockResolvedValueOnce({
        items: [mockLead as never],
        meta: {
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });

      const res = await request(app)
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${superAdminWithOrgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('rejects Super Admin calling /api/v1/crm/dashboard/stats without tenant context with 403 TENANT_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/crm/dashboard/stats')
        .set('Authorization', `Bearer ${superAdminWithoutOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_REQUIRED');
    });

    it('rejects Super Admin calling /api/v1/crm/dashboard/notifications without tenant context with 403 TENANT_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/crm/dashboard/notifications')
        .set('Authorization', `Bearer ${superAdminWithoutOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_REQUIRED');
    });

    it('rejects Super Admin calling /api/v1/crm/dashboard/report without tenant context with 403 TENANT_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/crm/dashboard/report')
        .set('Authorization', `Bearer ${superAdminWithoutOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_REQUIRED');
    });
  });
});
