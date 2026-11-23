import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminAuditLogRepository } from '../src/modules/admin/auditLogs/adminAuditLog.repository';

describe('Super Admin Audit Logs Endpoint (GET /api/v1/admin/audit-logs)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'user_super_admin_audit_test_1',
    email: 'superadmin_audit@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: 'user_regular_audit_test_1',
    email: 'regular_audit@fioner.test',
    isSuperAdmin: false,
  });

  const mockAuditLogsList = [
    {
      id: 'audit_log_1',
      action: 'admin.user_deactivated',
      entity: 'User',
      entityId: 'target_user_1',
      organizationId: null,
      actorId: superAdminUser.id,
      ipAddress: '127.0.0.1',
      metadata: { reason: 'Violation of terms' },
      createdAt: new Date('2026-10-10T12:00:00Z'),
      actor: {
        id: superAdminUser.id,
        email: superAdminUser.email,
        firstName: 'Super',
        lastName: 'Admin',
      },
      organization: null,
    },
    {
      id: 'audit_log_2',
      action: 'lead.created',
      entity: 'Lead',
      entityId: 'lead_1',
      organizationId: 'org_1',
      actorId: 'user_sales_1',
      ipAddress: '192.168.1.1',
      metadata: { name: 'Acme Lead', value: 50000 },
      createdAt: new Date('2026-10-09T10:00:00Z'),
      actor: {
        id: 'user_sales_1',
        email: 'sales@fioner.test',
        firstName: 'Sam',
        lastName: 'Sales',
      },
      organization: {
        id: 'org_1',
        name: 'Acme Fleet',
        slug: 'acme-fleet',
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
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: superAdminUser.id,
      email: superAdminUser.email,
      isSuperAdmin: true,
      isActive: true,
    } as never);
  });

  describe('Authorization & Boundary Enforcement', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/audit-logs');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-Super-Admin users with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'user_regular_audit_test_1',
        email: 'regular_audit@fioner.test',
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
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
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows active Super Admin without organization membership or X-Organization-Id', async () => {
      vi.spyOn(adminAuditLogRepository, 'listAuditLogs').mockResolvedValueOnce({
        items: mockAuditLogsList,
        total: 2,
      });

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta?.pagination).toBeDefined();
      expect(res.body.meta.pagination.total).toBe(2);
    });
  });

  describe('Validation & Query Handling', () => {
    it('rejects invalid page (< 1) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?page=0')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid limit (> 100) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?limit=500')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid sortOrder with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?sortOrder=sideways')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects malformed startDate with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?startDate=not-a-date')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('passes validated filters to repository', async () => {
      const listSpy = vi
        .spyOn(adminAuditLogRepository, 'listAuditLogs')
        .mockResolvedValueOnce({ items: [], total: 0 });

      const res = await request(app)
        .get(
          '/api/v1/admin/audit-logs?action=admin.user_deactivated&entity=User&entityId=usr_123&actorId=usr_admin&organizationId=org_abc&search=deactivated&startDate=2026-10-01T00:00:00Z&endDate=2026-10-10T23:59:59Z&page=2&limit=15&sortBy=action&sortOrder=asc',
        )
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith({
        skip: 15,
        take: 15,
        orderBy: { action: 'asc' },
        search: 'deactivated',
        action: 'admin.user_deactivated',
        entity: 'User',
        entityId: 'usr_123',
        actorId: 'usr_admin',
        organizationId: 'org_abc',
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: new Date('2026-10-10T23:59:59.000Z'),
      });
    });

    it('falls back safely to createdAt desc for unsupported sortBy', async () => {
      const listSpy = vi
        .spyOn(adminAuditLogRepository, 'listAuditLogs')
        .mockResolvedValueOnce({ items: [], total: 0 });

      const res = await request(app)
        .get('/api/v1/admin/audit-logs?sortBy=nonexistent_field')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('Response Envelopes & Security Safeguards', () => {
    it('returns empty results predictably with total 0', async () => {
      vi.spyOn(adminAuditLogRepository, 'listAuditLogs').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta?.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('never leaks sensitive credentials or secrets from audit items or actor', async () => {
      vi.spyOn(adminAuditLogRepository, 'listAuditLogs').mockResolvedValueOnce({
        items: mockAuditLogsList,
        total: 2,
      });

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data;
      for (const item of items) {
        expect(item).not.toHaveProperty('password');
        expect(item).not.toHaveProperty('passwordHash');
        expect(item).not.toHaveProperty('token');
        expect(item).not.toHaveProperty('refreshToken');
        if (item.actor) {
          expect(item.actor).not.toHaveProperty('passwordHash');
          expect(item.actor).not.toHaveProperty('refreshToken');
        }
      }
    });

    it('returns safe error envelope on internal database failure', async () => {
      vi.spyOn(adminAuditLogRepository, 'listAuditLogs').mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(res.body).not.toHaveProperty('stack');
    });
  });
});
