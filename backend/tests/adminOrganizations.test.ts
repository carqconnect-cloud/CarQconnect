import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminOrganizationRepository } from '../src/modules/admin/organizations/adminOrganization.repository';
import { auditService } from '../src/modules/audit/audit.service';

describe('Super Admin Organizations Endpoints (/api/v1/admin/organizations)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'user_super_admin_org_test_1',
    email: 'superadmin_org@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: 'user_regular_org_test_1',
    email: 'regular_org@fioner.test',
    isSuperAdmin: false,
  });

  const mockOrganizationsList = [
    {
      id: 'org_test_1',
      name: 'Acme Logistics',
      slug: 'acme-logistics',
      logoUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
      _count: {
        memberships: 5,
      },
    },
    {
      id: 'org_test_2',
      name: 'Beta Transport',
      slug: 'beta-transport',
      logoUrl: 'https://example.com/beta.png',
      isActive: false,
      createdAt: new Date('2026-01-15T00:00:00Z'),
      updatedAt: new Date('2026-02-15T00:00:00Z'),
      _count: {
        memberships: 2,
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
  });

  // =========================================================================
  // 1. Authorization & Security Boundary
  // =========================================================================
  describe('Authorization & Security Boundary', () => {
    it('rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/organizations');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-Super-Admin with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Super admin access required');
    });

    it('rejects deactivated Super Admin with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: false,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Super admin access required');
    });

    it('succeeds regardless of arbitrary X-Organization-Id without invoking tenant resolution', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      const membershipSpy = vi.spyOn(prisma.membership, 'findFirst');

      vi.spyOn(adminOrganizationRepository, 'listOrganizations').mockResolvedValueOnce({
        items: [] as never,
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Organization-Id', 'org_unrelated_foreign');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(membershipSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Listing & Filtering (GET /api/v1/admin/organizations)
  // =========================================================================
  describe('Listing & Filtering (GET /api/v1/admin/organizations)', () => {
    beforeEach(() => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        isSuperAdmin: true,
        isActive: true,
      } as never);
    });

    it('lists organizations with pagination metadata and member counts', async () => {
      const repoSpy = vi
        .spyOn(adminOrganizationRepository, 'listOrganizations')
        .mockResolvedValueOnce({
          items: mockOrganizationsList as never,
          total: 2,
        });

      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('Acme Logistics');
      expect(res.body.data[0]._count.memberships).toBe(5);
      expect(res.body.meta.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      expect(repoSpy).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        search: undefined,
        isActive: undefined,
      });
    });

    it('filters organizations by search term', async () => {
      const repoSpy = vi
        .spyOn(adminOrganizationRepository, 'listOrganizations')
        .mockResolvedValueOnce({
          items: [mockOrganizationsList[0]!] as never,
          total: 1,
        });

      const res = await request(app)
        .get('/api/v1/admin/organizations?search=acme')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'acme',
        }),
      );
    });

    it('filters organizations by isActive boolean query parameter', async () => {
      const repoSpy = vi
        .spyOn(adminOrganizationRepository, 'listOrganizations')
        .mockResolvedValueOnce({
          items: [mockOrganizationsList[1]!] as never,
          total: 1,
        });

      const res = await request(app)
        .get('/api/v1/admin/organizations?isActive=false')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });

    it('respects custom pagination and allowlisted sorting parameters', async () => {
      const repoSpy = vi
        .spyOn(adminOrganizationRepository, 'listOrganizations')
        .mockResolvedValueOnce({
          items: [] as never,
          total: 45,
        });

      const res = await request(app)
        .get('/api/v1/admin/organizations?page=2&limit=15&sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith({
        skip: 15,
        take: 15,
        orderBy: { name: 'asc' },
        search: undefined,
        isActive: undefined,
      });

      expect(res.body.meta.pagination).toEqual({
        total: 45,
        page: 2,
        limit: 15,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('falls back to default sortBy (createdAt desc) if unknown sortBy is provided', async () => {
      const repoSpy = vi
        .spyOn(adminOrganizationRepository, 'listOrganizations')
        .mockResolvedValueOnce({
          items: [] as never,
          total: 0,
        });

      const res = await request(app)
        .get('/api/v1/admin/organizations?sortBy=unknownField')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('returns 400 VALIDATION_ERROR on invalid sortOrder', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?sortOrder=invalid')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 VALIDATION_ERROR when limit exceeds MAX_LIMIT (100)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?limit=150')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 3. Organization Detail Retrieval (GET /api/v1/admin/organizations/:id)
  // =========================================================================
  describe('Detail Retrieval (GET /api/v1/admin/organizations/:id)', () => {
    beforeEach(() => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        isSuperAdmin: true,
        isActive: true,
      } as never);
    });

    it('returns 404 NOT_FOUND when organization does not exist', async () => {
      vi.spyOn(adminOrganizationRepository, 'findOrganizationById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/organizations/nonexistent_org_id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns organization detail with membership count for existing ID', async () => {
      vi.spyOn(adminOrganizationRepository, 'findOrganizationById').mockResolvedValueOnce(
        mockOrganizationsList[0]! as never,
      );

      const res = await request(app)
        .get('/api/v1/admin/organizations/org_test_1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('org_test_1');
      expect(res.body.data.name).toBe('Acme Logistics');
      expect(res.body.data._count.memberships).toBe(5);
    });
  });

  // =========================================================================
  // 4. Status Management (PATCH /api/v1/admin/organizations/:id/status)
  // =========================================================================
  describe('Status Management (PATCH /api/v1/admin/organizations/:id/status)', () => {
    const targetOrgId = 'org_target_123';
    const targetOrg = {
      id: targetOrgId,
      name: 'Target Logistics',
      slug: 'target-logistics',
      logoUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
      _count: { memberships: 3 },
    };

    beforeEach(() => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        isSuperAdmin: true,
        isActive: true,
      } as never);
    });

    it('rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .send({ isActive: false });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-Super-Admin with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects deactivated Super Admin with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: false,
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects request with missing isActive field with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Some suspension reason' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-boolean isActive with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: 'false' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects reason exceeding 500 characters with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: 'x'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND when target organization does not exist', async () => {
      vi.spyOn(adminOrganizationRepository, 'findOrganizationById').mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/v1/admin/organizations/nonexistent_org/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('deactivates an active organization: updates status and records admin.organization_deactivated in transaction', async () => {
      vi.spyOn(adminOrganizationRepository, 'findOrganizationById').mockResolvedValueOnce({
        ...targetOrg,
        isActive: true,
      } as never);

      const updateSpy = vi
        .spyOn(adminOrganizationRepository, 'updateOrganizationStatus')
        .mockResolvedValueOnce({
          ...targetOrg,
          isActive: false,
        } as never);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: '  Non-payment suspension  ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      expect(updateSpy).toHaveBeenCalledWith(targetOrgId, false, expect.anything());
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: targetOrgId,
          actorId: superAdminUser.id,
          action: 'admin.organization_deactivated',
          entity: 'Organization',
          entityId: targetOrgId,
          metadata: {
            previousStatus: true,
            newStatus: false,
            reason: 'Non-payment suspension',
          },
        }),
        expect.anything(),
      );
    });

    it('reactivates an inactive organization: updates status and records admin.organization_reactivated in transaction', async () => {
      vi.spyOn(adminOrganizationRepository, 'findOrganizationById').mockResolvedValueOnce({
        ...targetOrg,
        isActive: false,
      } as never);

      const updateSpy = vi
        .spyOn(adminOrganizationRepository, 'updateOrganizationStatus')
        .mockResolvedValueOnce({
          ...targetOrg,
          isActive: true,
        } as never);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);

      expect(updateSpy).toHaveBeenCalledWith(targetOrgId, true, expect.anything());
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: targetOrgId,
          actorId: superAdminUser.id,
          action: 'admin.organization_reactivated',
          entity: 'Organization',
          entityId: targetOrgId,
          metadata: {
            previousStatus: false,
            newStatus: true,
          },
        }),
        expect.anything(),
      );
    });

    it('idempotently returns organization without audit write when status is unchanged', async () => {
      vi.spyOn(adminOrganizationRepository, 'findOrganizationById').mockResolvedValueOnce({
        ...targetOrg,
        isActive: true,
      } as never);

      const updateSpy = vi.spyOn(adminOrganizationRepository, 'updateOrganizationStatus');
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(auditSpy).not.toHaveBeenCalled();
    });

    it('omits empty/whitespace-only reason from audit metadata', async () => {
      vi.spyOn(adminOrganizationRepository, 'findOrganizationById').mockResolvedValueOnce({
        ...targetOrg,
        isActive: true,
      } as never);

      vi.spyOn(adminOrganizationRepository, 'updateOrganizationStatus').mockResolvedValueOnce({
        ...targetOrg,
        isActive: false,
      } as never);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${targetOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: '     ' });

      expect(res.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            previousStatus: true,
            newStatus: false,
          },
        }),
        expect.anything(),
      );
    });
  });
});
