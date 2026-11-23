import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/common/utils/password';
import { signAccessToken, hashRefreshToken } from '../src/common/utils/jwt';
import { authRepository } from '../src/modules/auth/auth.repository';
import { auditService } from '../src/modules/audit/audit.service';
import { prisma } from '../src/config/database';
import { MembershipStatus, Role } from '@prisma/client';

describe('Auth HTTP Endpoints (/api/v1/auth/*)', () => {
  const app = createApp();

  const mockUser = {
    id: 'user_auth_test_1',
    email: 'test@example.com',
    passwordHash: '',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    isActive: true,
    isSuperAdmin: false,
    phone: '+919876543210',
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrg = {
    id: 'org_auth_test_1',
    name: 'Test Org',
    slug: 'test-org',
    logoUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership = {
    id: 'mem_auth_test_1',
    userId: mockUser.id,
    organizationId: mockOrg.id,
    role: Role.OWNER,
    status: MembershipStatus.ACTIVE,
    isDefault: true,
    invitedById: null,
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: mockOrg.id,
      name: mockOrg.name,
      slug: mockOrg.slug,
    },
  };

  const validToken = signAccessToken({
    sub: mockUser.id,
    email: mockUser.email,
    isSuperAdmin: false,
    organizationId: mockOrg.id,
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
    mockUser.passwordHash = await hashPassword('ValidPass123');
  });

  // =========================================================================
  // 1. POST /api/v1/auth/register
  // =========================================================================
  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a user and organization, returning 201 with auth envelope', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce(null);
      vi.spyOn(authRepository, 'slugExists').mockResolvedValue(null);
      vi.spyOn(authRepository, 'createUserWithOrganization').mockResolvedValueOnce({
        user: mockUser,
        organization: mockOrg,
        membership: mockMembership as never,
      });
      vi.spyOn(authRepository, 'createRefreshToken').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'ValidPass123',
          organizationName: 'Test Org',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.firstName).toBe('Test');
      expect(res.body.data.organizations).toHaveLength(1);
      expect(res.body.data.organizations[0].role).toBe('OWNER');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('rejects registration when email already exists with 409 CONFLICT', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Duplicate',
          lastName: 'User',
          email: 'test@example.com',
          password: 'ValidPass123',
          organizationName: 'Another Org',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already exists');
    });

    it('rejects registration with missing required fields with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with weak password (<8 chars or missing complexity) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'weak',
          organizationName: 'Test Org',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body.error.details)).toContain('Password must be at least 8 characters');
    });

    it('rejects registration with invalid email format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'not-an-email',
          password: 'ValidPass123',
          organizationName: 'Test Org',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 2. POST /api/v1/auth/login
  // =========================================================================
  describe('POST /api/v1/auth/login', () => {
    it('successfully logs in with valid credentials returning 200 with tokens and orgs', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce(mockUser);
      vi.spyOn(authRepository, 'findMemberships').mockResolvedValueOnce([mockMembership as never]);
      vi.spyOn(authRepository, 'updateUser').mockResolvedValueOnce({} as never);
      vi.spyOn(authRepository, 'createRefreshToken').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(mockUser.id);
      expect(res.body.data.organizations).toHaveLength(1);
      expect(res.body.data.activeOrganizationId).toBe(mockOrg.id);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('rejects login with incorrect password with 401 INVALID_CREDENTIALS', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects login with non-existent email with generic 401 INVALID_CREDENTIALS', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPass123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects login for deactivated account with 403 Forbidden', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('This account has been deactivated');
    });

    it('rejects login with invalid payload format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects login with organizationId the user does not belong to with 403 Forbidden', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValueOnce(mockUser);
      vi.spyOn(authRepository, 'findMemberships').mockResolvedValueOnce([mockMembership as never]);
      vi.spyOn(authRepository, 'findMembership').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123',
          organizationId: 'org_unauthorized_999',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('do not have access to this organization');
    });
  });

  // =========================================================================
  // 3. POST /api/v1/auth/refresh
  // =========================================================================
  describe('POST /api/v1/auth/refresh', () => {
    const rawRefreshToken = 'test_raw_refresh_token_123';
    const hashed = hashRefreshToken(rawRefreshToken);

    it('successfully rotates refresh token and returns new tokens (200 OK)', async () => {
      const storedToken = {
        id: 'token_1',
        userId: mockUser.id,
        tokenHash: hashed,
        organizationId: mockOrg.id,
        expiresAt: new Date(Date.now() + 86400000), // tomorrow
        revokedAt: null,
        replacedById: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        user: mockUser,
      };

      vi.spyOn(authRepository, 'findRefreshToken')
        .mockResolvedValueOnce(storedToken as never)
        .mockResolvedValueOnce({ id: 'token_2' } as never);
      vi.spyOn(authRepository, 'createRefreshToken').mockResolvedValueOnce({} as never);
      const revokeSpy = vi.spyOn(authRepository, 'revokeRefreshToken').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rawRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
      expect(revokeSpy).toHaveBeenCalledWith('token_1', 'token_2');
    });

    it('rejects unknown refresh token with 401 Unauthorized', async () => {
      vi.spyOn(authRepository, 'findRefreshToken').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rawRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid refresh token');
    });

    it('detects token replay (revoked token reuse), revokes all sessions and rejects with 401', async () => {
      const revokedToken = {
        id: 'token_revoked',
        userId: mockUser.id,
        tokenHash: hashed,
        organizationId: mockOrg.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(), // Already revoked!
        replacedById: 'token_replacement',
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        user: mockUser,
      };

      vi.spyOn(authRepository, 'findRefreshToken').mockResolvedValueOnce(revokedToken as never);
      const revokeAllSpy = vi.spyOn(authRepository, 'revokeAllUserTokens').mockResolvedValueOnce({ count: 2 } as never);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rawRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Refresh token has been revoked');
      expect(revokeAllSpy).toHaveBeenCalledWith(mockUser.id);
    });

    it('rejects expired refresh token with 401 TOKEN_EXPIRED', async () => {
      const expiredToken = {
        id: 'token_expired',
        userId: mockUser.id,
        tokenHash: hashed,
        organizationId: mockOrg.id,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        revokedAt: null,
        replacedById: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        user: mockUser,
      };

      vi.spyOn(authRepository, 'findRefreshToken').mockResolvedValueOnce(expiredToken as never);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rawRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects refresh when user account is deactivated with 403 Forbidden', async () => {
      const activeTokenWithDeactivatedUser = {
        id: 'token_1',
        userId: mockUser.id,
        tokenHash: hashed,
        organizationId: mockOrg.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        replacedById: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        user: { ...mockUser, isActive: false },
      };

      vi.spyOn(authRepository, 'findRefreshToken').mockResolvedValueOnce(activeTokenWithDeactivatedUser as never);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rawRefreshToken });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('This account has been deactivated');
    });

    it('rejects refresh with missing refreshToken field with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 4. POST /api/v1/auth/logout
  // =========================================================================
  describe('POST /api/v1/auth/logout', () => {
    it('revokes the provided refresh token and returns 204 No Content', async () => {
      const stored = { id: 'token_logout', revokedAt: null };
      vi.spyOn(authRepository, 'findRefreshToken').mockResolvedValueOnce(stored as never);
      const revokeSpy = vi.spyOn(authRepository, 'revokeRefreshToken').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'some_refresh_token' });

      expect(res.status).toBe(204);
      expect(revokeSpy).toHaveBeenCalledWith('token_logout');
    });

    it('returns 204 idempotently if token already revoked or unknown', async () => {
      vi.spyOn(authRepository, 'findRefreshToken').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'non_existent_token' });

      expect(res.status).toBe(204);
    });

    it('rejects logout with missing body with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 5. Authenticated Endpoints (/me, /logout-all, /switch-organization, /change-password)
  // =========================================================================
  describe('Authenticated Auth Routes', () => {
    it('GET /api/v1/auth/me returns 200 with user profile and organizations', async () => {
      vi.spyOn(authRepository, 'findUserById').mockResolvedValueOnce(mockUser);
      vi.spyOn(authRepository, 'findMemberships').mockResolvedValueOnce([mockMembership as never]);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(mockUser.email);
      expect(res.body.data.organizations).toHaveLength(1);
    });

    it('GET /api/v1/auth/me rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('GET /api/v1/auth/me rejects invalid bearer token with 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('POST /api/v1/auth/logout-all revokes all sessions and returns 204 No Content', async () => {
      const revokeAllSpy = vi.spyOn(authRepository, 'revokeAllUserTokens').mockResolvedValueOnce({ count: 3 } as never);

      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(204);
      expect(revokeAllSpy).toHaveBeenCalledWith(mockUser.id);
    });

    it('POST /api/v1/auth/switch-organization returns 200 with new tokens for valid organization membership', async () => {
      const secondOrgMembership = {
        ...mockMembership,
        organizationId: 'org_second_2',
        role: Role.ADMIN,
      };

      vi.spyOn(authRepository, 'findMembership').mockResolvedValueOnce(secondOrgMembership as never);
      vi.spyOn(authRepository, 'findUserById').mockResolvedValueOnce(mockUser);
      vi.spyOn(authRepository, 'createRefreshToken').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/auth/switch-organization')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ organizationId: 'org_second_2' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activeOrganizationId).toBe('org_second_2');
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('POST /api/v1/auth/switch-organization rejects switch to non-member org with 403 Forbidden', async () => {
      vi.spyOn(authRepository, 'findMembership').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/switch-organization')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ organizationId: 'org_unauthorized' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('do not have access to this organization');
    });

    it('POST /api/v1/auth/change-password changes password and revokes all user sessions (204)', async () => {
      vi.spyOn(authRepository, 'findUserById').mockResolvedValueOnce(mockUser);
      const updateSpy = vi.spyOn(authRepository, 'updateUser').mockResolvedValueOnce({} as never);
      const revokeAllSpy = vi.spyOn(authRepository, 'revokeAllUserTokens').mockResolvedValueOnce({ count: 1 } as never);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'ValidPass123',
          newPassword: 'NewSecurePass456',
        });

      expect(res.status).toBe(204);
      expect(updateSpy).toHaveBeenCalled();
      expect(revokeAllSpy).toHaveBeenCalledWith(mockUser.id, expect.anything());
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUser.id,
          action: 'auth.password_changed',
          entity: 'User',
          entityId: mockUser.id,
        }),
        expect.anything(),
      );
    });

    it('POST /api/v1/auth/change-password rejects when current password is incorrect with 400 Bad Request', async () => {
      vi.spyOn(authRepository, 'findUserById').mockResolvedValueOnce(mockUser);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword',
          newPassword: 'NewSecurePass456',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Current password is incorrect');
      expect(auditSpy).not.toHaveBeenCalled();
    });
  });
});
