import type { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { hasAtLeastRole } from '../constants/roles';
import { ApiError } from '../utils/apiError';

/** Allows the request only for the listed roles. Super admins always pass. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (req.auth.isSuperAdmin) return next();
    if (!req.tenant) return next(ApiError.forbidden('Organization context required'));
    if (!roles.includes(req.tenant.role)) {
      return next(ApiError.forbidden(`Requires one of: ${roles.join(', ')}`));
    }
    next();
  };
}

/** Allows the request for the given role and anything above it. */
export function requireMinRole(minimum: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (req.auth.isSuperAdmin) return next();
    if (!req.tenant) return next(ApiError.forbidden('Organization context required'));
    if (!hasAtLeastRole(req.tenant.role, minimum)) {
      return next(ApiError.forbidden(`Requires ${minimum} access or higher`));
    }
    next();
  };
}
