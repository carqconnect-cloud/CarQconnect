import type { Role } from '@prisma/client';

/** Request augmentation — set by auth.middleware and tenant.middleware. */
declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      email: string;
      isSuperAdmin: boolean;
      isSubSuperAdmin?: boolean;
      userType?: 'superAdmin' | 'subSuperAdmin' | 'crmUser' | 'appUser';
    }

    interface TenantContext {
      organizationId: string;
      membershipId: string;
      role: Role;
    }

    interface Request {
      auth?: AuthContext;
      tenant?: TenantContext;
      requestId?: string;
    }
  }
}

export {};
