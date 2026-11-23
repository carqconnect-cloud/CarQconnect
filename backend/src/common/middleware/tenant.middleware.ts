import { MembershipStatus } from '@prisma/client';
import type { RequestHandler } from 'express';
import { prisma } from '../../config/database';
import { ORGANIZATION_HEADER } from '../constants';
import { ErrorCode } from '../constants/http';
import { ApiError } from '../utils/apiError';

/**
 * Resolves the organization for the request and proves the caller belongs to it.
 *
 * Order of resolution:
 *   1. `X-Organization-Id` header (what the frontends send after org switch)
 *   2. the user's default membership
 *   3. their only membership, if they have exactly one
 *
 * Must run AFTER requireAuth.
 */
export const resolveTenant: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) throw ApiError.unauthorized();

    const headerValue = req.headers[ORGANIZATION_HEADER];
    const requestedOrgId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    let membership: any = await prisma.membership.findFirst({
      where: {
        userId: req.auth.userId,
        status: MembershipStatus.ACTIVE,
        organization: { isActive: true },
        ...(requestedOrgId ? { organizationId: requestedOrgId } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, organizationId: true, role: true },
    });

    if (!membership) {
      const crmUser = await prisma.crmUser.findFirst({
        where: {
          id: req.auth.userId,
          status: { in: [MembershipStatus.ACTIVE, MembershipStatus.INVITED] },
          organization: { isActive: true },
          ...(requestedOrgId ? { organizationId: requestedOrgId } : {}),
        },
        select: { id: true, organizationId: true, role: true },
      });
      if (crmUser) {
        membership = crmUser;
      }
    }

    if (!membership) {
      throw new ApiError(
        403,
        requestedOrgId
          ? 'You do not have access to this organization'
          : 'No active organization found for this account',
        ErrorCode.TENANT_REQUIRED,
      );
    }

    req.tenant = {
      organizationId: membership.organizationId,
      membershipId: membership.id,
      role: membership.role,
    };
    next();
  } catch (error) {
    next(error);
  }
};
