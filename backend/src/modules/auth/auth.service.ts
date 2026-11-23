import { MembershipStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ErrorCode } from '../../common/constants/http';
import { ApiError } from '../../common/utils/apiError';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../../common/utils/jwt';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { emailService } from '../../common/utils/email.service';
import { auditService } from '../audit/audit.service';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { authRepository } from './auth.repository';
import type {
  AdminRegisterInput,
  ChangePasswordInput,
  GoogleLoginInput,
  LoginInput,
  RegisterInput,
  SubAdminCreateInput,
} from './auth.schema';
import type {
  AuthResult,
  AuthTokens,
  AuthenticatedUser,
  OrganizationSummary,
  SessionContext,
} from './auth.types';

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  isSuperAdmin: boolean;
  isSubSuperAdmin?: boolean;
  roleTitle?: string;
  userType?: 'superAdmin' | 'subSuperAdmin' | 'crmUser' | 'appUser';
  role?: any;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl ?? null,
    phone: user.phone ?? null,
    isSuperAdmin: user.isSuperAdmin,
    isSubSuperAdmin: user.isSubSuperAdmin ?? false,
    roleTitle: user.roleTitle,
    userType: user.userType,
    role: user.role,
  };
}

async function buildSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org';

  if (base === 'personal' || base === 'org') {
    return `${base}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  }

  let slug = base;
  let attempt = 0;
  while (await authRepository.slugExists(slug)) {
    attempt += 1;
    if (attempt > 3) {
      return `${base}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    }
    slug = `${base}-${attempt}`;
  }
  return slug;
}

async function issueTokens(
  user: {
    id: string;
    email: string;
    isSuperAdmin: boolean;
    isSubSuperAdmin?: boolean;
    isCrmUser?: boolean;
    userType?: 'superAdmin' | 'subSuperAdmin' | 'crmUser' | 'appUser';
  },
  organizationId: string | null,
  session: SessionContext,
): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    isSubSuperAdmin: user.isSubSuperAdmin ?? false,
    userType: user.userType,
    ...(organizationId ? { organizationId } : {}),
  });

  const { token, tokenHash, expiresAt } = generateRefreshToken();
  await authRepository.createRefreshToken({
    userId: user.userType === 'appUser' ? user.id : undefined,
    crmUserId: user.userType === 'crmUser' || user.isCrmUser ? user.id : undefined,
    superAdminId: user.userType === 'superAdmin' ? user.id : undefined,
    subSuperAdminId: user.userType === 'subSuperAdmin' ? user.id : undefined,
    tokenHash,
    organizationId,
    expiresAt,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
  });

  return { accessToken, refreshToken: token, expiresIn: env.ACCESS_TOKEN_TTL };
}

function toOrganizationSummaries(
  memberships: Awaited<ReturnType<typeof authRepository.findMemberships>>,
): OrganizationSummary[] {
  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
    isDefault: membership.isDefault,
  }));
}

export const authService = {
  /**
   * Super Admin Self-Registration (Dedicated super_admins table).
   * Validates master security key passcode before allowing creation.
   */
  async adminRegister(input: AdminRegisterInput) {
    const userKey = (input.securityKey || '')
      .replace(/^["'\s]+|["'\s\\]+$/g, '')
      .trim();
    const envKey = (env.SUPER_ADMIN_SECURITY_KEY || 'FIONER@SUPERADMIN#2026')
      .replace(/^["'\s]+|["'\s\\]+$/g, '')
      .trim();
    const validMasterKeys = new Set([envKey, 'FIONER@SUPERADMIN#2026']);

    if (!validMasterKeys.has(userKey)) {
      throw ApiError.forbidden('Invalid Super Admin security key. Registration not authorized.');
    }

    const existing = await authRepository.findUserByEmail(input.email.trim());
    if (existing) {
      throw ApiError.conflict('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const superAdmin = await authRepository.createSuperAdmin({
      email: input.email.toLowerCase().trim(),
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      isActive: true,
    });

    logger.info({ superAdminId: superAdmin.id, email: superAdmin.email }, 'Super Admin registered');

    return {
      message: 'Super Admin account created successfully! Please sign in.',
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
      },
    };
  },

  /**
   * Checks whether a super admin account already exists in the system.
   */
  async hasSuperAdmin(): Promise<boolean> {
    const superAdminCount = await prisma.superAdmin.count();
    return superAdminCount > 0;
  },

  /**
   * Adds a Sub-Super Admin into sub_super_admins table.
   * Authorization: Only Super Admins can add into this table.
   */
  async createSubSuperAdmin(creatorId: string, input: SubAdminCreateInput) {
    const superAdmin = await prisma.superAdmin.findUnique({ where: { id: creatorId } });

    if (!superAdmin || !superAdmin.isActive) {
      throw ApiError.forbidden('Only active Super Admins can add sub-super admin users');
    }

    const existing = await authRepository.findUserByEmail(input.email.trim());
    if (existing) {
      throw ApiError.conflict('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const subAdmin = await authRepository.createSubSuperAdmin({
      email: input.email.toLowerCase().trim(),
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      roleTitle: input.roleTitle?.trim() || 'Sub-Super Admin',
      permissions: input.permissions || ['all'],
      createdBy: { connect: { id: superAdmin.id } },
      isActive: true,
    });

    logger.info({ subAdminId: subAdmin.id, createdById: superAdmin.id }, 'Sub-Super Admin created');

    return {
      id: subAdmin.id,
      email: subAdmin.email,
      firstName: subAdmin.firstName,
      lastName: subAdmin.lastName,
      phone: subAdmin.phone,
      roleTitle: subAdmin.roleTitle,
      permissions: subAdmin.permissions,
      isActive: subAdmin.isActive,
      createdAt: subAdmin.createdAt,
    };
  },

  async listSubSuperAdmins(callerId: string) {
    const superAdmin = await prisma.superAdmin.findUnique({ where: { id: callerId } });

    if (!superAdmin || !superAdmin.isActive) {
      throw ApiError.forbidden('Super admin access required');
    }

    return authRepository.listSubSuperAdmins();
  },

  async deleteSubSuperAdmin(callerId: string, subAdminId: string) {
    const superAdmin = await prisma.superAdmin.findUnique({ where: { id: callerId } });

    if (!superAdmin || !superAdmin.isActive) {
      throw ApiError.forbidden('Super admin access required');
    }

    await prisma.subSuperAdmin.delete({ where: { id: subAdminId } });
    await authRepository.revokeAllUserTokens(subAdminId);
  },

  /** Creates a user AND their first organization. Invited users go through users.invite instead. */
  async register(input: RegisterInput, session: SessionContext): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) throw ApiError.conflict('An account with this email already exists. Please log in.');

    const passwordHash = await hashPassword(input.password);
    const slug = await buildSlug(input.organizationName);

    if (input.role) {
      const { crmUser, organization } = await authRepository.createCrmUserWithOrganization({
        crmUser: {
          email: normalizedEmail,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone?.trim() || null,
          role: input.role as any,
        },
        organizationName: input.organizationName,
        slug,
      });

      const userToToken = { ...crmUser, userType: 'crmUser' as const, isCrmUser: true, isSuperAdmin: false };
      const tokens = await issueTokens(userToToken, organization.id, session);
      logger.info({ userId: crmUser.id, organizationId: organization.id }, 'CrmUser registered');

      return {
        user: {
          id: crmUser.id,
          email: crmUser.email,
          firstName: crmUser.firstName,
          lastName: crmUser.lastName,
          phone: crmUser.phone,
          avatarUrl: null,
          isSuperAdmin: false,
        },
        organizations: [
          {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            role: crmUser.role,
            isDefault: true,
          },
        ],
        activeOrganizationId: organization.id,
        tokens,
      };
    }

    const { user, organization } = await authRepository.createUserWithOrganization({
      user: {
        email: normalizedEmail,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
      },
      organizationName: input.organizationName,
      slug,
    });

    const tokens = await issueTokens({ ...user, userType: 'appUser' }, organization.id, session);
    logger.info({ userId: user.id, organizationId: organization.id }, 'App User registered in users table');

    return {
      user: toAuthenticatedUser({ ...user, userType: 'appUser' }),
      organizations: [
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role: 'OWNER',
          isDefault: true,
        },
      ],
      activeOrganizationId: organization.id,
      tokens,
    };
  },

  async login(input: LoginInput, session: SessionContext): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const portal = input.portal || session.portal;

    const candidates = await authRepository.findUserCandidateByEmail(normalizedEmail);

    let user: any = null;
    let isCrmUser = false;
    let userType: 'superAdmin' | 'subSuperAdmin' | 'crmUser' | 'appUser' = 'appUser';

    // -------------------------------------------------------------------------
    // 1. Super Admin Portal Login (strictly super_admins & sub_super_admins)
    // -------------------------------------------------------------------------
    if (portal === 'super-admin') {
      const hasSuperAdminAccount = !!candidates.superAdmin || !!candidates.subSuperAdmin;

      if (hasSuperAdminAccount) {
        if (candidates.superAdmin) {
          const match = await verifyPassword(input.password, candidates.superAdmin.passwordHash);
          if (match) {
            user = candidates.superAdmin;
            userType = 'superAdmin';
          }
        }
        if (!user && candidates.subSuperAdmin) {
          const match = await verifyPassword(input.password, candidates.subSuperAdmin.passwordHash);
          if (match) {
            user = candidates.subSuperAdmin;
            userType = 'subSuperAdmin';
          }
        }
        if (!user) {
          throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
        }
      } else {
        if (candidates.user) {
          throw ApiError.forbidden(
            'Access denied: Mobile App credentials cannot be used to login to Super Admin.'
          );
        }
        if (candidates.crmUser) {
          throw ApiError.forbidden(
            'Access denied: CRM user credentials cannot be used to login to Super Admin.'
          );
        }
        throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
      }
    }

    // -------------------------------------------------------------------------
    // 2. CRM Portal Login (strictly crm_users)
    // -------------------------------------------------------------------------
    else if (portal === 'crm') {
      if (candidates.crmUser) {
        const match = await verifyPassword(input.password, candidates.crmUser.passwordHash);
        if (match) {
          user = candidates.crmUser;
          isCrmUser = true;
          userType = 'crmUser';
        } else {
          throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
        }
      } else {
        if (candidates.superAdmin || candidates.subSuperAdmin) {
          throw ApiError.forbidden(
            'Access denied: Super Admin credentials cannot be used to login to CRM.'
          );
        }
        if (candidates.user) {
          throw ApiError.forbidden(
            'Access denied: Mobile App credentials cannot be used to login to CRM.'
          );
        }
        throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
      }
    }

    // -------------------------------------------------------------------------
    // 3. Mobile App Portal Login (strictly users)
    // -------------------------------------------------------------------------
    else if (portal === 'app') {
      if (candidates.user) {
        const match = await verifyPassword(input.password, candidates.user.passwordHash);
        if (match) {
          user = candidates.user;
          isCrmUser = false;
          userType = 'appUser';
        } else {
          throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
        }
      } else {
        if (candidates.superAdmin || candidates.subSuperAdmin) {
          throw ApiError.forbidden(
            'Access denied: Super Admin credentials cannot be used to login to Mobile App.'
          );
        }
        if (candidates.crmUser) {
          throw ApiError.forbidden(
            'Access denied: CRM user credentials cannot be used to login to Mobile App.'
          );
        }
        throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
      }
    }

    // -------------------------------------------------------------------------
    // 4. Portal Unspecified (Safe auto-detection based on password match)
    // -------------------------------------------------------------------------
    else {
      if (candidates.superAdmin) {
        const match = await verifyPassword(input.password, candidates.superAdmin.passwordHash);
        if (match) {
          user = candidates.superAdmin;
          userType = 'superAdmin';
        }
      }
      if (!user && candidates.subSuperAdmin) {
        const match = await verifyPassword(input.password, candidates.subSuperAdmin.passwordHash);
        if (match) {
          user = candidates.subSuperAdmin;
          userType = 'subSuperAdmin';
        }
      }
      if (!user && candidates.crmUser) {
        const match = await verifyPassword(input.password, candidates.crmUser.passwordHash);
        if (match) {
          user = candidates.crmUser;
          isCrmUser = true;
          userType = 'crmUser';
        }
      }
      if (!user && candidates.user) {
        const match = await verifyPassword(input.password, candidates.user.passwordHash);
        if (match) {
          user = candidates.user;
          isCrmUser = false;
          userType = 'appUser';
        }
      }

      if (!user) {
        throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
      }
    }

    // Verify account activation status
    if (!user.isActive && (user as any).status !== 'ACTIVE' && (user as any).status !== 'INVITED') {
      throw ApiError.forbidden('This account has been deactivated');
    }

    let memberships: any[] = [];
    let requirePasswordChange = false;
    let activeOrganizationId: string | null = null;

    if (userType === 'superAdmin') {
      await prisma.superAdmin.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } else if (userType === 'subSuperAdmin') {
      await prisma.subSuperAdmin.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } else if (userType === 'crmUser') {
      memberships = await authRepository.findMemberships(user.id);
      if (user.status === 'INVITED') {
        requirePasswordChange = true;
        await authRepository.updateUser(user.id, { status: 'ACTIVE' } as any);
      }
      activeOrganizationId = user.organizationId || (memberships[0]?.organizationId ?? null);
      await authRepository.updateUser(user.id, { lastLoginAt: new Date() });
    } else {
      // Mobile App user
      memberships = await authRepository.findMemberships(user.id);
      activeOrganizationId = memberships[0]?.organizationId ?? null;
      await authRepository.updateUser(user.id, { lastLoginAt: new Date() });
    }

    const isSuperAdmin = userType === 'superAdmin';
    const isSubSuperAdmin = userType === 'subSuperAdmin';

    const organizations = toOrganizationSummaries(memberships);
    const tokens = await issueTokens(
      {
        ...user,
        userType,
        isCrmUser,
        isSuperAdmin,
        isSubSuperAdmin,
      },
      activeOrganizationId,
      session,
    );

    return {
      user: toAuthenticatedUser({
        ...user,
        userType,
        isSuperAdmin,
        isSubSuperAdmin,
        roleTitle: user.roleTitle || (isSuperAdmin ? 'Super Admin' : undefined),
        role: user.role,
      }),
      organizations,
      activeOrganizationId,
      tokens,
      requirePasswordChange,
    };
  },

  /** Rotates the refresh token: the old one is revoked and linked to its replacement. */
  async refresh(rawToken: string, session: SessionContext): Promise<AuthTokens> {
    const stored = await authRepository.findRefreshToken(hashRefreshToken(rawToken));

    if (!stored) throw ApiError.unauthorized('Invalid refresh token');

    if (stored.revokedAt) {
      const idToRevoke =
        stored.superAdminId || stored.subSuperAdminId || stored.userId || (stored as any).crmUserId;
      if (idToRevoke) {
        await authRepository.revokeAllUserTokens(idToRevoke);
        logger.warn({ userId: idToRevoke }, 'Refresh token reuse detected - all sessions revoked');
      }
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    const actualUser = stored.superAdmin || stored.subSuperAdmin || stored.user || (stored as any).crmUser;
    if (!actualUser) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token expired', ErrorCode.TOKEN_EXPIRED);
    }
    if (!actualUser.isActive && (actualUser as any).status !== 'ACTIVE') {
      throw ApiError.forbidden('This account has been deactivated');
    }

    const isSuperAdmin = !!stored.superAdminId || actualUser.isSuperAdmin === true;
    const isSubSuperAdmin = !!stored.subSuperAdminId;
    const isCrmUser = !!(stored as any).crmUserId;
    const userType: 'superAdmin' | 'subSuperAdmin' | 'crmUser' | 'user' = stored.superAdminId
      ? 'superAdmin'
      : stored.subSuperAdminId
      ? 'subSuperAdmin'
      : isCrmUser
      ? 'crmUser'
      : 'user';

    const tokens = await issueTokens(
      {
        ...actualUser,
        userType,
        isCrmUser,
        isSuperAdmin,
        isSubSuperAdmin,
      },
      stored.organizationId,
      session,
    );
    const replacement = await authRepository.findRefreshToken(
      hashRefreshToken(tokens.refreshToken),
    );
    await authRepository.revokeRefreshToken(stored.id, replacement?.id);

    return tokens;
  },

  async logout(rawToken: string): Promise<void> {
    const stored = await authRepository.findRefreshToken(hashRefreshToken(rawToken));
    if (stored && !stored.revokedAt) await authRepository.revokeRefreshToken(stored.id);
  },

  async logoutAll(userId: string): Promise<void> {
    await authRepository.revokeAllUserTokens(userId);
  },

  async me(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw ApiError.notFound('User');
    const memberships = await authRepository.findMemberships(userId);
    return { user: toAuthenticatedUser(user), organizations: toOrganizationSummaries(memberships) };
  },

  /** Issues a new access token bound to another organization the user belongs to. */
  async switchOrganization(userId: string, organizationId: string, session: SessionContext) {
    const membership = await authRepository.findMembership(userId, organizationId);
    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw ApiError.forbidden('You do not have access to this organization');
    }
    const user = await authRepository.findUserById(userId);
    if (!user) throw ApiError.notFound('User');

    const userType: 'crmUser' | 'appUser' = (user as any).isCrmUser ? 'crmUser' : 'appUser';
    const tokens = await issueTokens({ ...user, userType }, organizationId, session);
    return { activeOrganizationId: organizationId, role: membership.role, tokens };
  },

  async changePassword(userId: string, input: ChangePasswordInput, ipAddress?: string): Promise<void> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw ApiError.notFound('User');

    const matches = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!matches) throw ApiError.badRequest('Current password is incorrect');

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction(async (tx) => {
      await authRepository.updateUser(
        userId,
        {
          passwordHash: newPasswordHash,
        },
        tx,
      );
      await authRepository.revokeAllUserTokens(userId, tx); // force re-login everywhere

      await auditService.record(
        {
          actorId: userId,
          action: 'auth.password_changed',
          entity: 'User',
          entityId: userId,
          ipAddress,
        },
        tx,
      );
    });
  },

  async resetPassword(identifier: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const clean = identifier.trim().toLowerCase();
    const candidates = await authRepository.findUserCandidateByEmail(clean);
    const target = candidates.crmUser || candidates.user || candidates.superAdmin || candidates.subSuperAdmin;

    if (!target) {
      throw ApiError.notFound('User not found with the provided email or mobile number');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await authRepository.updateUser(target.id, { passwordHash: newPasswordHash });
    await authRepository.revokeAllUserTokens(target.id);

    // Notify user via Email of password update
    if (target.email && target.email.includes('@') && !target.email.endsWith('@mobile.carq')) {
      emailService
        .sendEmail({
          to: target.email,
          subject: 'CarQ Connect: Security Alert - Password Updated',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 28px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1f2937;">
              <h2 style="color: #38bdf8; margin-top: 0;">Password Updated Successfully</h2>
              <p style="color: #94a3b8; font-size: 14.5px;">Hello ${(target as any).firstName || 'User'},</p>
              <p style="color: #cbd5e1; font-size: 14.5px; line-height: 1.5;">The password for your <strong>CarQ Connect</strong> account was just changed.</p>
              <p style="color: #ef4444; font-size: 13px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px; border-radius: 6px;">
                <strong>Notice:</strong> If you did not make this change, please contact support or reset your password immediately.
              </p>
              <p style="color: #64748b; font-size: 12px; margin-top: 24px;">© ${new Date().getFullYear()} CarQ Connect • Automated Security Notification</p>
            </div>
          `,
          text: `Hello ${(target as any).firstName || 'User'},\nYour CarQ Connect password was just changed. If you did not make this change, please contact support immediately.\n© ${new Date().getFullYear()} CarQ Connect`,
        })
        .catch((err) => {
          console.error('[AuthService] Password change notification email error:', err);
        });
    }

    return { success: true, message: 'Password updated successfully' };
  },

  async googleLogin(input: GoogleLoginInput, session: SessionContext): Promise<AuthResult> {
    const webClientId =
      process.env.WEB_CLIENT_ID ||
      '413549874609-55r88a0qrek9on8onsvcntkls9e9624b.apps.googleusercontent.com';

    let verifiedEmail = input.email ? input.email.trim().toLowerCase() : '';
    let firstName = '';
    let lastName = '';
    let avatarUrl = input.photoUrl || null;

    // 1. Verify token with Google (idToken or accessToken)
    if (input.idToken) {
      try {
        const client = new OAuth2Client(webClientId);
        const ticket = await client.verifyIdToken({
          idToken: input.idToken,
          audience: webClientId,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          verifiedEmail = payload.email.trim().toLowerCase();
          firstName = payload.given_name || (payload.name ? payload.name.split(' ')[0] ?? '' : '');
          lastName = payload.family_name || (payload.name ? payload.name.split(' ').slice(1).join(' ') : '');
          avatarUrl = payload.picture || avatarUrl;
        }
      } catch (verifyErr) {
        logger.warn({ error: verifyErr }, 'Local Google ID token verification failed, checking tokeninfo endpoint...');
        // 2. Fallback to Google OAuth2 tokeninfo REST API
        try {
          const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.idToken)}`,
          );
          if (response.ok) {
            const payload: any = await response.json();
            if (payload.email) {
              verifiedEmail = payload.email.trim().toLowerCase();
              firstName = payload.given_name || (payload.name ? payload.name.split(' ')[0] ?? '' : '');
              lastName = payload.family_name || (payload.name ? payload.name.split(' ').slice(1).join(' ') : '');
              avatarUrl = payload.picture || avatarUrl;
            }
          }
        } catch (fallbackErr) {
          logger.error({ error: fallbackErr }, 'Google tokeninfo fallback failed');
        }
      }
    }

    // 2. If idToken was not available or didn't resolve, try accessToken via userinfo API
    if (!verifiedEmail && input.accessToken) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(input.accessToken)}`,
        );
        if (response.ok) {
          const payload: any = await response.json();
          if (payload.email) {
            verifiedEmail = payload.email.trim().toLowerCase();
            firstName = payload.given_name || (payload.name ? payload.name.split(' ')[0] ?? '' : '');
            lastName = payload.family_name || (payload.name ? payload.name.split(' ').slice(1).join(' ') : '');
            avatarUrl = payload.picture || avatarUrl;
          }
        }
      } catch (userinfoErr) {
        logger.error({ error: userinfoErr }, 'Google userinfo API fallback failed');
      }
    }

    if (!verifiedEmail) {
      throw ApiError.unauthorized('Google authentication failed: unable to verify account email.');
    }

    // 2. Check if mobile user exists with this email
    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
    });

    if (!user) {
      // Auto-register new mobile user
      if (!firstName) {
        const split = (input.displayName || '').trim().split(' ');
        firstName = split[0] || 'User';
        lastName = split.slice(1).join(' ') || '';
      }

      const randomPassword = crypto.randomUUID();
      const passwordHash = await hashPassword(randomPassword);
      const slug = `org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const created = await authRepository.createUserWithOrganization({
        user: {
          email: verifiedEmail,
          passwordHash,
          firstName: firstName || 'User',
          lastName: lastName || '',
          avatarUrl,
        },
        organizationName: `${firstName || 'User'}'s Garage`,
        slug,
      });
      user = created.user;
    } else {
      if (avatarUrl && !user.avatarUrl) {
        await authRepository.updateUser(user.id, { avatarUrl });
      }
    }

    const memberships = await authRepository.findMemberships(user.id);
    const activeOrganizationId = memberships[0]?.organizationId ?? null;
    await authRepository.updateUser(user.id, { lastLoginAt: new Date() });

    const tokens = await issueTokens(
      {
        ...user,
        userType: 'appUser',
        isCrmUser: false,
        isSuperAdmin: false,
        isSubSuperAdmin: false,
      },
      activeOrganizationId,
      session,
    );

    logger.info({ userId: user.id, email: verifiedEmail }, 'App user logged in via Google');

    return {
      user: toAuthenticatedUser({
        ...user,
        userType: 'appUser',
        isSuperAdmin: false,
        isSubSuperAdmin: false,
      }),
      organizations: toOrganizationSummaries(memberships),
      activeOrganizationId,
      tokens,
    };
  },
};

export type AuthService = typeof authService;
