import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminUserRepository } from '../src/modules/admin/users/adminUser.repository';
import { MembershipStatus, Role } from '@prisma/client';
import { auditService } from '../src/modules/audit/audit.service';
import { authRepository } from '../src/modules/auth/auth.repository';

describe('Super Admin Users Endpoint (GET /api/v1/admin/users)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'user_super_admin_test_1',
    email: 'superadmin@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: 'user_regular_test_1',
    email: 'regular@fioner.test',
    isSuperAdmin: false,
  });

  const mockUsersList = [
    {
      id: 'usr_1',
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Morgan',
      phone: '+919876543210',
      avatarUrl: null,
      isActive: true,
      isSuperAdmin: false,
      emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
      lastLoginAt: new Date('2026-02-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
      memberships: [
        {
          id: 'mem_1',
          role: Role.OWNER,
          status: MembershipStatus.ACTIVE,
          isDefault: true,
          organization: {
            id: 'org_1',
            name: 'Acme Fleet',
            slug: 'acme-fleet',
            isActive: true,
          },
        },
      ],
    },
    {
      id: 'usr_2',
      email: 'priya@example.com',
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+919876543211',
      avatarUrl: null,
      isActive: false,
      isSuperAdmin: false,
      emailVerifiedAt: new Date('2026-01-10T00:00:00Z'),
      lastLoginAt: null,
      createdAt: new Date('2026-01-10T00:00:00Z'),
      updatedAt: new Date('2026-01-10T00:00:00Z'),
      memberships: [],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    // In unit tests, prisma.$transaction passes through callbacks or mocked arrays
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
  });

  // =========================================================================
  // 1. Authorization & Boundary Checks
  // =========================================================================
  describe('Authorization & Security Boundary', () => {
    it('allows active Super Admin to list platform users without X-Organization-Id', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      const repoSpy = vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: mockUsersList as never,
        total: 2,
      });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].email).toBe('alex@example.com');
      expect(res.body.data[0]).not.toHaveProperty('passwordHash');
      expect(res.body.data[0].memberships).toHaveLength(1);
      expect(res.body.data[0].memberships[0].organization.name).toBe('Acme Fleet');
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
        isSuperAdmin: undefined,
      });
    });

    it('rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/users');

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
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Super admin access required');
    });

    it('rejects inactive Super Admin with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: false,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Super admin access required');
    });

    it('succeeds regardless of arbitrary X-Organization-Id header without invoking tenant resolution', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      const membershipSpy = vi.spyOn(prisma.membership, 'findFirst');

      vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: [] as never,
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Organization-Id', 'org_unrelated_foreign');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(membershipSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Query Parameters, Filters, & Sorting
  // =========================================================================
  describe('Query Parameters, Filtering & Pagination', () => {
    beforeEach(() => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        isSuperAdmin: true,
        isActive: true,
      } as never);
    });

    it('filters users by search term', async () => {
      const repoSpy = vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: [mockUsersList[0]!] as never,
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/users?search=alex')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'alex',
        }),
      );
    });

    it('filters users by isActive boolean query parameter', async () => {
      const repoSpy = vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: [mockUsersList[1]!] as never,
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/users?isActive=false')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });

    it('filters users by isSuperAdmin boolean query parameter', async () => {
      const repoSpy = vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: [] as never,
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/users?isSuperAdmin=true')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuperAdmin: true,
        }),
      );
    });

    it('respects custom pagination and allowlisted sorting parameters', async () => {
      const repoSpy = vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: [] as never,
        total: 55,
      });

      const res = await request(app)
        .get('/api/v1/admin/users?page=3&limit=10&sortBy=email&sortOrder=asc')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(repoSpy).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        orderBy: { email: 'asc' },
        search: undefined,
        isActive: undefined,
        isSuperAdmin: undefined,
      });

      expect(res.body.meta.pagination).toEqual({
        total: 55,
        page: 3,
        limit: 10,
        totalPages: 6,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('falls back to default sortBy (createdAt desc) if unknown sortBy is provided', async () => {
      const repoSpy = vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: [] as never,
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/users?sortBy=nonexistentColumn')
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
        .get('/api/v1/admin/users?sortOrder=invalidOrder')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 VALIDATION_ERROR when limit exceeds MAX_LIMIT (100)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?limit=150')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns empty array with valid envelope when no users match', async () => {
      vi.spyOn(adminUserRepository, 'listUsers').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/users?search=nonexistentUserXYZ')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });

  // =========================================================================
  // 6. User Status Management (PATCH /api/v1/admin/users/:id/status)
  // =========================================================================
  describe('User Status Management (PATCH /api/v1/admin/users/:id/status)', () => {
    const targetUserId = 'usr_target_123';
    const targetUser = {
      id: targetUserId,
      email: 'target@example.com',
      firstName: 'Target',
      lastName: 'User',
      phone: '+919876543210',
      avatarUrl: null,
      isActive: true,
      isSuperAdmin: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    };

    it('rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
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
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
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
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects request with missing isActive field with 400 VALIDATION_ERROR', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Some reason' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-boolean isActive with 400 VALIDATION_ERROR', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: 'false' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects reason exceeding 500 characters with 400 VALIDATION_ERROR', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: 'a'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND when target user does not exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/v1/admin/users/nonexistent_user/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects self-deactivation with 400 BAD_REQUEST', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce({
        ...targetUser,
        id: superAdminUser.id,
        isSuperAdmin: true,
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${superAdminUser.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: 'Attempting self-deactivation' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('You cannot deactivate your own account');
    });

    it('rejects deactivation of another Super Admin account with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce({
        ...targetUser,
        id: 'other_super_admin_id',
        isSuperAdmin: true,
      } as never);

      const res = await request(app)
        .patch('/api/v1/admin/users/other_super_admin_id/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: 'Deactivating peer admin' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toBe('Super Admin accounts cannot be deactivated through this endpoint');
    });

    it('deactivates an active user: revokes tokens and records audit event in transaction', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce({
        ...targetUser,
        isActive: true,
      } as never);

      const updateSpy = vi.spyOn(adminUserRepository, 'updateUserStatus').mockResolvedValueOnce({
        ...targetUser,
        isActive: false,
      } as never);

      const revokeSpy = vi.spyOn(authRepository, 'revokeAllUserTokens').mockResolvedValueOnce({
        count: 3,
      } as never);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: '  Policy violation notice  ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data).not.toHaveProperty('passwordHash');

      expect(updateSpy).toHaveBeenCalledWith(targetUserId, false, expect.anything());
      expect(revokeSpy).toHaveBeenCalledWith(targetUserId, expect.anything());
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: superAdminUser.id,
          action: 'admin.user_deactivated',
          entity: 'User',
          entityId: targetUserId,
          metadata: {
            previousStatus: true,
            newStatus: false,
            reason: 'Policy violation notice',
          },
        }),
        expect.anything(),
      );
    });

    it('reactivates an inactive user: does not revoke tokens and records admin.user_reactivated', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce({
        ...targetUser,
        isActive: false,
      } as never);

      const updateSpy = vi.spyOn(adminUserRepository, 'updateUserStatus').mockResolvedValueOnce({
        ...targetUser,
        isActive: true,
      } as never);

      const revokeSpy = vi.spyOn(authRepository, 'revokeAllUserTokens');
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);

      expect(updateSpy).toHaveBeenCalledWith(targetUserId, true, expect.anything());
      expect(revokeSpy).not.toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: superAdminUser.id,
          action: 'admin.user_reactivated',
          entity: 'User',
          entityId: targetUserId,
          metadata: {
            previousStatus: false,
            newStatus: true,
          },
        }),
        expect.anything(),
      );
    });

    it('idempotently returns user without audit or token mutations when status is unchanged', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce({
        ...targetUser,
        isActive: true,
      } as never);

      const updateSpy = vi.spyOn(adminUserRepository, 'updateUserStatus');
      const revokeSpy = vi.spyOn(authRepository, 'revokeAllUserTokens');
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(revokeSpy).not.toHaveBeenCalled();
      expect(auditSpy).not.toHaveBeenCalled();
    });

    it('omits empty/whitespace-only reason from audit metadata', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce({
        ...targetUser,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'updateUserStatus').mockResolvedValueOnce({
        ...targetUser,
        isActive: false,
      } as never);

      vi.spyOn(authRepository, 'revokeAllUserTokens').mockResolvedValueOnce({ count: 1 } as never);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: '    ' });

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

  // =========================================================================
  // 3. User Creation (POST /api/v1/admin/users)
  // =========================================================================
  describe('User Creation', () => {
    const createPayload = {
      firstName: 'Nisha',
      lastName: 'Patel',
      email: 'nisha.patel@example.com',
      phone: '+919876543212',
      password: 'SafePassword123',
      isActive: true,
    };

    it('creates a user through the Super Admin contract without returning password data', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);
      vi.spyOn(adminUserRepository, 'findUserByEmail').mockResolvedValueOnce(null);
      const createSpy = vi.spyOn(adminUserRepository, 'createUser').mockResolvedValueOnce({
        id: 'usr_created_1',
        firstName: createPayload.firstName,
        lastName: createPayload.lastName,
        email: createPayload.email,
        phone: createPayload.phone,
        isActive: true,
        isSuperAdmin: false,
        createdAt: new Date('2026-10-22T00:00:00Z'),
      } as never);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(createPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: 'usr_created_1',
        email: createPayload.email,
        isSuperAdmin: false,
      });
      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createPayload.email,
          passwordHash: expect.any(String),
        }),
        expect.anything(),
      );
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.user_created' }),
        expect.anything(),
      );
    });

    it('rejects duplicate email addresses without creating a user', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);
      vi.spyOn(adminUserRepository, 'findUserByEmail').mockResolvedValueOnce({ id: 'existing_user' });
      const createSpy = vi.spyOn(adminUserRepository, 'createUser');

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(createPayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects invalid passwords before creating a user', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);
      const createSpy = vi.spyOn(adminUserRepository, 'createUser');

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ ...createPayload, password: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('persists profile edits through the Super Admin contract', async () => {
      vi.spyOn(prisma.user, 'findUnique')
        .mockResolvedValueOnce({ isSuperAdmin: true, isActive: true } as never);
      vi.spyOn(adminUserRepository, 'findUserById').mockResolvedValueOnce({
        id: 'usr_profile_1',
        email: 'before@example.com',
      } as never);
      const updateSpy = vi.spyOn(adminUserRepository, 'updateUserProfile').mockResolvedValueOnce({
        id: 'usr_profile_1',
        firstName: 'Nisha',
        lastName: 'Patel',
        email: 'after@example.com',
        phone: '+919876543299',
        isActive: true,
        isSuperAdmin: false,
        createdAt: new Date('2026-10-22T00:00:00Z'),
        updatedAt: new Date('2026-10-22T01:00:00Z'),
      } as never);
      vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .patch('/api/v1/admin/users/usr_profile_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ firstName: 'Nisha', lastName: 'Patel', email: 'after@example.com', phone: '+919876543299' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'usr_profile_1', email: 'after@example.com' });
      expect(updateSpy).toHaveBeenCalledWith(
        'usr_profile_1',
        expect.objectContaining({ email: 'after@example.com' }),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // 3. Customer 360 User Detail (GET /api/v1/admin/users/:id)
  // =========================================================================
  describe('Customer 360 User Detail (GET /api/v1/admin/users/:id)', () => {
    const detailUserId = 'usr_detail_123';
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days in future (UP_TO_DATE)
    const expiringSoonDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future (EXPIRING_SOON)

    const mockDetailUser = {
      id: detailUserId,
      email: 'customer360@example.com',
      firstName: 'Rahul',
      lastName: 'Verma',
      phone: '+919876543299',
      avatarUrl: 'https://cdn.example.com/avatars/rahul.jpg',
      isActive: true,
      isSuperAdmin: false,
      emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
      lastLoginAt: new Date('2026-03-01T12:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-03-01T12:00:00Z'),
      memberships: [
        {
          id: 'mem_c360_1',
          role: Role.OWNER,
          status: MembershipStatus.ACTIVE,
          isDefault: true,
          organization: {
            id: 'org_c360_1',
            name: 'Apex Logistics',
            slug: 'apex-logistics',
            isActive: true,
          },
        },
      ],
      vehicles: [
        {
          id: 'veh_c360_1',
          reg: 'MH12AB1234',
          model: 'Tata Ace',
          fuel: 'DIESEL',
          mileage: 45000,
          docExpiry: futureDate,
          isDefault: true,
          createdAt: new Date('2026-01-15T00:00:00Z'),
          updatedAt: new Date('2026-01-15T00:00:00Z'),
          documents: [
            {
              id: 'doc_c360_1',
              type: 'RC',
              documentNumber: 'RC-12345',
              expiryDate: expiringSoonDate,
              notes: 'Registration certificate',
              createdAt: new Date('2026-01-15T00:00:00Z'),
            },
          ],
          qrCode: {
            id: 'qr_c360_1',
            code: 'QR-APEX-01',
            batch: 'BATCH-2026-01',
            status: 'ACTIVE',
            scansCount: 42,
            createdAt: new Date('2026-01-16T00:00:00Z'),
          },
          gpsDevice: {
            id: 'gps_c360_1',
            imei: '864201234567890',
            serialNumber: 'SN-GPS-001',
            model: 'GT06N',
            vendor: 'Concox',
            status: 'ACTIVE',
            batteryLevel: 95,
            signalStrength: 'EXCELLENT',
            lastSeenAt: new Date('2026-03-01T11:50:00Z'),
          },
        },
      ],
      orders: [
        {
          id: 'ord_c360_1',
          orderNo: 'FR-100001',
          status: 'DELIVERED',
          payStatus: 'PAID',
          amount: 2499,
          currency: 'INR',
          awb: 'AWB987654321',
          placedAt: new Date('2026-02-01T10:00:00Z'),
          items: [
            {
              id: 'item_c360_1',
              productName: 'Fioner Smart QR Tag',
              sku: 'SKU-QR-001',
              unitPrice: 2499,
              quantity: 1,
              totalPrice: 2499,
            },
          ],
        },
      ],
      subscriptions: [
        {
          id: 'sub_c360_1',
          status: 'ACTIVE',
          startedAt: new Date('2026-02-01T10:05:00Z'),
          expiresAt: new Date('2027-02-01T10:05:00Z'),
          autoRenew: true,
          paymentId: 'pay_c360_rzp_1',
          plan: {
            id: 'plan_gold_1',
            slug: 'gold-annual',
            name: 'Gold Annual Membership',
            priceInPaise: 299900,
            validityDays: 365,
            color: 'gold',
          },
        },
      ],
      auditLogs: [
        {
          id: 'audit_c360_1',
          action: 'admin.user_reactivated',
          entity: 'User',
          entityId: detailUserId,
          metadata: { note: 'Account verified' },
          ipAddress: '192.168.1.1',
          createdAt: new Date('2026-02-15T14:30:00Z'),
          actor: {
            id: superAdminUser.id,
            email: superAdminUser.email,
            firstName: 'Super',
            lastName: 'Admin',
          },
        },
      ],
    };

    it('rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get(`/api/v1/admin/users/${detailUserId}`);

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
        .get(`/api/v1/admin/users/${detailUserId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

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
        .get(`/api/v1/admin/users/${detailUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 NOT_FOUND when requested user does not exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserDetailById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/users/nonexistent_usr_404')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 200 with complete Customer 360 payload including vehicles, QR, GPS, orders, subscriptions, and audit logs', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      const repoSpy = vi.spyOn(adminUserRepository, 'findUserDetailById').mockResolvedValueOnce(mockDetailUser as never);

      const res = await request(app)
        .get(`/api/v1/admin/users/${detailUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(repoSpy).toHaveBeenCalledWith(detailUserId);

      const data = res.body.data;

      // 1. User & profile details
      expect(data.id).toBe(detailUserId);
      expect(data.email).toBe('customer360@example.com');
      expect(data.firstName).toBe('Rahul');
      expect(data.lastName).toBe('Verma');
      expect(data.phone).toBe('+919876543299');
      expect(data.avatarUrl).toBe('https://cdn.example.com/avatars/rahul.jpg');
      expect(data.isActive).toBe(true);
      expect(data.isSuperAdmin).toBe(false);
      expect(data.memberships).toHaveLength(1);
      expect(data.memberships[0].organization.name).toBe('Apex Logistics');

      // 2. Vehicles with calculated reminderStatus and linked QR & GPS
      expect(data.vehicles).toHaveLength(1);
      const vehicle = data.vehicles[0];
      expect(vehicle.reg).toBe('MH12AB1234');
      expect(vehicle.model).toBe('Tata Ace');
      expect(vehicle.reminderStatus).toBe('UP_TO_DATE');
      expect(vehicle.reminderLabel).toBe('Up to date');
      expect(vehicle.qrCode).toBeDefined();
      expect(vehicle.qrCode.code).toBe('QR-APEX-01');
      expect(vehicle.qrCode.status).toBe('ACTIVE');
      expect(vehicle.gpsDevice).toBeDefined();
      expect(vehicle.gpsDevice.imei).toBe('864201234567890');
      expect(vehicle.gpsDevice.status).toBe('ACTIVE');
      expect(vehicle.documents).toHaveLength(1);
      expect(vehicle.documents[0].reminderStatus).toBe('EXPIRING_SOON');

      // 3. Orders
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].orderNo).toBe('FR-100001');
      expect(data.orders[0].payStatus).toBe('PAID');
      expect(data.orders[0].amount).toBe(2499);
      expect(data.orders[0].items).toHaveLength(1);

      // 4. Subscriptions
      expect(data.subscriptions).toHaveLength(1);
      expect(data.subscriptions[0].status).toBe('ACTIVE');
      expect(data.subscriptions[0].plan.name).toBe('Gold Annual Membership');

      // 5. Audit Activity
      expect(data.activity).toHaveLength(1);
      expect(data.activity[0].action).toBe('admin.user_reactivated');
      expect(data.activity[0].actor.email).toBe(superAdminUser.email);

      // 6. Explicit Support Desk dependency reporting
      expect(data.supportDesk).toBeDefined();
      expect(data.supportDesk.status).toBe('UNAVAILABLE');
      expect(data.supportDesk.tickets).toEqual([]);

      // 7. Security: never expose sensitive fields
      expect(data).not.toHaveProperty('passwordHash');
      expect(data).not.toHaveProperty('tokens');
      expect(data).not.toHaveProperty('refreshTokens');
    });

    it('handles user with zero vehicles, orders, subscriptions, and audit logs gracefully', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        isSuperAdmin: true,
        isActive: true,
      } as never);

      vi.spyOn(adminUserRepository, 'findUserDetailById').mockResolvedValueOnce({
        ...mockDetailUser,
        memberships: [],
        vehicles: [],
        orders: [],
        subscriptions: [],
        auditLogs: [],
      } as never);

      const res = await request(app)
        .get(`/api/v1/admin/users/${detailUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicles).toEqual([]);
      expect(res.body.data.orders).toEqual([]);
      expect(res.body.data.subscriptions).toEqual([]);
      expect(res.body.data.activity).toEqual([]);
      expect(res.body.data.memberships).toEqual([]);
    });
  });
});
