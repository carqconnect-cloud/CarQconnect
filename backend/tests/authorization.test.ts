import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { requireMinRole } from '../src/common/middleware/authorize.middleware';
import { requireSuperAdmin } from '../src/common/middleware/auth.middleware';
import { ROLE_RANK } from '../src/common/constants/roles';
import { ApiError } from '../src/common/utils/apiError';
import { prisma } from '../src/config/database';
import { orgOf as leadOrgOf } from '../src/modules/crm/leads/lead.controller';
import { orgOf as customerOrgOf } from '../src/modules/crm/customers/customer.controller';
import { orgOf as teamOrgOf } from '../src/modules/crm/teams/team.controller';
import { orgOf as dashboardOrgOf } from '../src/modules/crm/dashboard/dashboard.controller';

function createMockReq(options: {
  role?: Role;
  isSuperAdmin?: boolean;
  hasAuth?: boolean;
  hasTenant?: boolean;
  organizationId?: string;
}): Request {
  const {
    role = Role.EXECUTIVE,
    isSuperAdmin = false,
    hasAuth = true,
    hasTenant = true,
    organizationId = 'org_test_1',
  } = options;

  const req = {} as Request;

  if (hasAuth) {
    req.auth = {
      userId: 'user_test_1',
      email: 'test@example.com',
      isSuperAdmin,
    };
  }

  if (hasTenant) {
    req.tenant = {
      organizationId,
      membershipId: 'mem_test_1',
      role,
    };
  }

  return req;
}

function runMiddleware(
  middleware: (req: Request, res: Response, next: (err?: unknown) => void) => void | Promise<void>,
  req: Request,
): Promise<{ calledNext: boolean; error: unknown }> {
  return new Promise((resolve) => {
    const res = {} as Response;
    let finished = false;

    const next = (err?: unknown) => {
      if (finished) return;
      finished = true;
      resolve({ calledNext: !err, error: err ?? null });
    };

    try {
      const result = middleware(req, res, next);
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).catch((err) => {
          if (!finished) {
            finished = true;
            resolve({ calledNext: false, error: err });
          }
        });
      }
    } catch (err) {
      if (!finished) {
        finished = true;
        resolve({ calledNext: false, error: err });
      }
    }
  });
}

describe('Role hierarchy definition', () => {
  it('strictly orders VIEWER < EXECUTIVE < TEAM_HEAD < ADMIN < OWNER', () => {
    expect(ROLE_RANK.VIEWER).toBeLessThan(ROLE_RANK.EXECUTIVE);
    expect(ROLE_RANK.EXECUTIVE).toBeLessThan(ROLE_RANK.TEAM_HEAD);
    expect(ROLE_RANK.TEAM_HEAD).toBeLessThan(ROLE_RANK.ADMIN);
    expect(ROLE_RANK.ADMIN).toBeLessThan(ROLE_RANK.OWNER);
  });
});

describe('requireMinRole(Role.ADMIN) hierarchy enforcement', () => {
  const adminGuard = requireMinRole(Role.ADMIN);

  it('rejects VIEWER with 403 Forbidden', async () => {
    const req = createMockReq({ role: Role.VIEWER });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toContain('Requires ADMIN access or higher');
  });

  it('rejects EXECUTIVE with 403 Forbidden', async () => {
    const req = createMockReq({ role: Role.EXECUTIVE });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toContain('Requires ADMIN access or higher');
  });

  it('rejects TEAM_HEAD with 403 Forbidden', async () => {
    const req = createMockReq({ role: Role.TEAM_HEAD });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toContain('Requires ADMIN access or higher');
  });

  it('allows ADMIN', async () => {
    const req = createMockReq({ role: Role.ADMIN });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });

  it('allows OWNER', async () => {
    const req = createMockReq({ role: Role.OWNER });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const req = createMockReq({ hasAuth: false });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(401);
  });

  it('rejects non-super-admin requests missing tenant context with 403', async () => {
    const req = createMockReq({ hasTenant: false, isSuperAdmin: false });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toBe('Organization context required');
  });
});

describe('Super Admin authorization bypass in requireMinRole', () => {
  const adminGuard = requireMinRole(Role.ADMIN);

  it('allows Super Admin regardless of tenant role (e.g. VIEWER)', async () => {
    const req = createMockReq({ role: Role.VIEWER, isSuperAdmin: true });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });

  it('allows Super Admin regardless of tenant role (e.g. EXECUTIVE)', async () => {
    const req = createMockReq({ role: Role.EXECUTIVE, isSuperAdmin: true });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });

  it('allows Super Admin even when req.tenant is completely absent', async () => {
    const req = createMockReq({ hasTenant: false, isSuperAdmin: true });
    const { calledNext, error } = await runMiddleware(adminGuard, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });
});

describe('requireSuperAdmin middleware DB re-verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows active Super Admin when confirmed by database', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      isSuperAdmin: true,
      isActive: true,
    } as never);

    const req = createMockReq({ isSuperAdmin: true });
    const { calledNext, error } = await runMiddleware(requireSuperAdmin, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });

  it('rejects active non-Super Admin with 403 Forbidden', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      isSuperAdmin: false,
      isActive: true,
    } as never);

    const req = createMockReq({ isSuperAdmin: false });
    const { calledNext, error } = await runMiddleware(requireSuperAdmin, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toBe('Super admin access required');
  });

  it('rejects inactive Super Admin with 403 Forbidden', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      isSuperAdmin: true,
      isActive: false,
    } as never);

    const req = createMockReq({ isSuperAdmin: true });
    const { calledNext, error } = await runMiddleware(requireSuperAdmin, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toBe('Super admin access required');
  });

  it('rejects when user is not found in database', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

    const req = createMockReq({ isSuperAdmin: true });
    const { calledNext, error } = await runMiddleware(requireSuperAdmin, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
  });

  it('rejects unauthenticated caller with 401', async () => {
    const req = createMockReq({ hasAuth: false });
    const { calledNext, error } = await runMiddleware(requireSuperAdmin, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(401);
  });
});

describe('CRM controller tenant fallback protection (fail-closed)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lead orgOf returns organizationId when req.tenant is present', () => {
    const req = createMockReq({ organizationId: 'org_lead_test' });
    expect(leadOrgOf(req)).toBe('org_lead_test');
  });

  it('lead orgOf throws 403 and never calls database when req.tenant is missing', () => {
    const findFirstSpy = vi.spyOn(prisma.organization, 'findFirst');
    const req = createMockReq({ hasTenant: false });

    expect(() => leadOrgOf(req)).toThrow(ApiError);
    try {
      leadOrgOf(req);
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(403);
      expect((err as ApiError).message).toBe('Organization context required');
    }

    expect(findFirstSpy).not.toHaveBeenCalled();
  });

  it('customer orgOf returns organizationId when req.tenant is present', () => {
    const req = createMockReq({ organizationId: 'org_customer_test' });
    expect(customerOrgOf(req)).toBe('org_customer_test');
  });

  it('customer orgOf throws 403 and never calls database when req.tenant is missing', () => {
    const findFirstSpy = vi.spyOn(prisma.organization, 'findFirst');
    const req = createMockReq({ hasTenant: false });

    expect(() => customerOrgOf(req)).toThrow(ApiError);
    try {
      customerOrgOf(req);
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(403);
      expect((err as ApiError).message).toBe('Organization context required');
    }

    expect(findFirstSpy).not.toHaveBeenCalled();
  });

  it('team orgOf returns organizationId when req.tenant is present', () => {
    const req = createMockReq({ organizationId: 'org_team_test' });
    expect(teamOrgOf(req)).toBe('org_team_test');
  });

  it('team orgOf throws 403 and never calls database when req.tenant is missing', () => {
    const findFirstSpy = vi.spyOn(prisma.organization, 'findFirst');
    const req = createMockReq({ hasTenant: false });

    expect(() => teamOrgOf(req)).toThrow(ApiError);
    try {
      teamOrgOf(req);
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(403);
      expect((err as ApiError).message).toBe('Organization context required');
    }

    expect(findFirstSpy).not.toHaveBeenCalled();
  });

  it('dashboard orgOf returns organizationId when req.tenant is present', () => {
    const req = createMockReq({ organizationId: 'org_dashboard_test' });
    expect(dashboardOrgOf(req)).toBe('org_dashboard_test');
  });

  it('dashboard orgOf throws 403 and never calls database when req.tenant is missing', () => {
    const findFirstSpy = vi.spyOn(prisma.organization, 'findFirst');
    const req = createMockReq({ hasTenant: false });

    expect(() => dashboardOrgOf(req)).toThrow(ApiError);
    try {
      dashboardOrgOf(req);
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(403);
      expect((err as ApiError).message).toBe('Organization context required');
    }

    expect(findFirstSpy).not.toHaveBeenCalled();
  });
});

describe('requireMinRole(Role.EXECUTIVE) lead create/update guard', () => {
  const executiveGuard = requireMinRole(Role.EXECUTIVE);

  it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
    const req = createMockReq({ hasAuth: false });
    const { calledNext, error } = await runMiddleware(executiveGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(401);
  });

  it('rejects authenticated requests missing tenant context with 403', async () => {
    const req = createMockReq({ hasTenant: false, isSuperAdmin: false });
    const { calledNext, error } = await runMiddleware(executiveGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toBe('Organization context required');
  });

  it('rejects VIEWER (below minimum) with 403 Forbidden', async () => {
    const req = createMockReq({ role: Role.VIEWER });
    const { calledNext, error } = await runMiddleware(executiveGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toContain('Requires EXECUTIVE access or higher');
  });

  it('allows EXECUTIVE access to create/update leads', async () => {
    const req = createMockReq({ role: Role.EXECUTIVE });
    const { calledNext, error } = await runMiddleware(executiveGuard, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });

  it('allows TEAM_HEAD, ADMIN, and OWNER as higher roles in hierarchy', async () => {
    for (const role of [Role.TEAM_HEAD, Role.ADMIN, Role.OWNER]) {
      const req = createMockReq({ role });
      const { calledNext, error } = await runMiddleware(executiveGuard, req);
      expect(calledNext).toBe(true);
      expect(error).toBeNull();
    }
  });
});

describe('requireMinRole(Role.TEAM_HEAD) lead delete guard', () => {
  const teamHeadGuard = requireMinRole(Role.TEAM_HEAD);

  it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
    const req = createMockReq({ hasAuth: false });
    const { calledNext, error } = await runMiddleware(teamHeadGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(401);
  });

  it('rejects authenticated requests missing tenant context with 403', async () => {
    const req = createMockReq({ hasTenant: false, isSuperAdmin: false });
    const { calledNext, error } = await runMiddleware(teamHeadGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toBe('Organization context required');
  });

  it('rejects VIEWER with 403 Forbidden', async () => {
    const req = createMockReq({ role: Role.VIEWER });
    const { calledNext, error } = await runMiddleware(teamHeadGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toContain('Requires TEAM_HEAD access or higher');
  });

  it('rejects EXECUTIVE (denied for delete) with 403 Forbidden', async () => {
    const req = createMockReq({ role: Role.EXECUTIVE });
    const { calledNext, error } = await runMiddleware(teamHeadGuard, req);

    expect(calledNext).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).message).toContain('Requires TEAM_HEAD access or higher');
  });

  it('allows TEAM_HEAD access to delete leads', async () => {
    const req = createMockReq({ role: Role.TEAM_HEAD });
    const { calledNext, error } = await runMiddleware(teamHeadGuard, req);

    expect(calledNext).toBe(true);
    expect(error).toBeNull();
  });

  it('allows ADMIN and OWNER access to delete leads as higher roles in hierarchy', async () => {
    for (const role of [Role.ADMIN, Role.OWNER]) {
      const req = createMockReq({ role });
      const { calledNext, error } = await runMiddleware(teamHeadGuard, req);
      expect(calledNext).toBe(true);
      expect(error).toBeNull();
    }
  });
});

