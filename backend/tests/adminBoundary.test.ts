import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';

describe('Super Admin routing boundary (/api/v1/admin/*)', () => {
  const app = createApp();

  const superAdminToken = signAccessToken({
    sub: 'user_super_admin_1',
    email: 'super@fioner.test',
    isSuperAdmin: true,
  });

  const normalUserToken = signAccessToken({
    sub: 'user_regular_1',
    email: 'employee@fioner.test',
    isSuperAdmin: false,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. allows active Super Admin without membership to access /admin/health', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      isSuperAdmin: true,
      isActive: true,
    } as never);

    const membershipSpy = vi.spyOn(prisma.membership, 'findFirst');
    const orgSpy = vi.spyOn(prisma.organization, 'findFirst');

    const res = await request(app)
      .get('/api/v1/admin/health')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: 'ok',
      },
    });

    // Proves tenant resolution was NEVER invoked
    expect(membershipSpy).not.toHaveBeenCalled();
    expect(orgSpy).not.toHaveBeenCalled();
  });

  it('2. rejects normal authenticated organization user from /admin/health with 403', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      isSuperAdmin: false,
      isActive: true,
    } as never);

    const res = await request(app)
      .get('/api/v1/admin/health')
      .set('Authorization', `Bearer ${normalUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Super admin access required');
  });

  it('3. rejects unauthenticated request from /admin/health with 401', async () => {
    const res = await request(app).get('/api/v1/admin/health');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Missing bearer token');
  });

  it('4. rejects inactive Super Admin from /admin/health with 403', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      isSuperAdmin: true,
      isActive: false,
    } as never);

    const res = await request(app)
      .get('/api/v1/admin/health')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Super admin access required');
  });

  it('5. succeeds for Super Admin regardless of arbitrary or missing X-Organization-Id header', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      isSuperAdmin: true,
      isActive: true,
    } as never);

    const membershipSpy = vi.spyOn(prisma.membership, 'findFirst');

    const res = await request(app)
      .get('/api/v1/admin/health')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('X-Organization-Id', 'org_arbitrary_123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: 'ok',
      },
    });

    // Still does not touch membership table
    expect(membershipSpy).not.toHaveBeenCalled();
  });

  it('6. preserves existing private tenant behavior (Super Admin without membership is rejected on /users)', async () => {
    // When Super Admin calls a private tenant route, resolveTenant runs and rejects if no membership exists
    vi.spyOn(prisma.membership, 'findFirst').mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TENANT_REQUIRED');
  });

  it('7. returns 404 NOT_FOUND for unknown API route (/api/v1/unregistered-path)', async () => {
    const res = await request(app).get('/api/v1/unregistered-path');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Route GET /api/v1/unregistered-path not found');
  });

  it('8. preserves 401 UNAUTHENTICATED for unauthenticated requests to known private routes', async () => {
    const resUsers = await request(app).get('/api/v1/users');
    expect(resUsers.status).toBe(401);
    expect(resUsers.body.error.code).toBe('UNAUTHENTICATED');
    expect(resUsers.body.error.message).toContain('Missing bearer token');

    const resLeads = await request(app).get('/api/v1/crm/leads');
    expect(resLeads.status).toBe(401);
    expect(resLeads.body.error.code).toBe('UNAUTHENTICATED');
    expect(resLeads.body.error.message).toContain('Missing bearer token');

    const resOrg = await request(app).get('/api/v1/organizations/current');
    expect(resOrg.status).toBe(401);
    expect(resOrg.body.error.code).toBe('UNAUTHENTICATED');
    expect(resOrg.body.error.message).toContain('Missing bearer token');
  });
});
