import type { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  isSubSuperAdmin?: boolean;
  roleTitle?: string;
  userType?: 'superAdmin' | 'subSuperAdmin' | 'crmUser' | 'appUser';
  role?: Role;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: Role;
  isDefault: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: AuthenticatedUser;
  organizations: OrganizationSummary[];
  activeOrganizationId: string | null;
  tokens: AuthTokens;
  requirePasswordChange?: boolean;
}

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
  portal?: 'super-admin' | 'crm' | 'app';
}
