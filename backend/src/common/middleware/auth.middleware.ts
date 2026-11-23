import type { RequestHandler } from 'express';
import { prisma } from '../../config/database';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';

function extractBearerToken(header?: string): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Rejects the request unless a valid access token is present. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) throw ApiError.unauthorized('Missing bearer token');

    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin,
      isSubSuperAdmin: payload.isSubSuperAdmin,
      userType: payload.userType,
    };
    next();
  } catch (error) {
    next(error);
  }
};

/** Attaches auth context when a token is present, but never rejects. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin,
      isSubSuperAdmin: payload.isSubSuperAdmin,
      userType: payload.userType,
    };
  } catch {
    // ignore — treated as anonymous
  }
  next();
};

/** Super-admin app only. Strictly validates against super_admins and sub_super_admins tables. */
export const requireSuperAdmin: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) throw ApiError.unauthorized();

    // Check dedicated super_admins table
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, isActive: true },
    });
    if (superAdmin) {
      if (!superAdmin.isActive) {
        throw ApiError.forbidden('Super admin account is deactivated');
      }
      return next();
    }

    // Check dedicated sub_super_admins table
    const subSuperAdmin = await prisma.subSuperAdmin.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, isActive: true },
    });
    if (subSuperAdmin) {
      if (!subSuperAdmin.isActive) {
        throw ApiError.forbidden('Sub-super admin account is deactivated');
      }
      return next();
    }

    // Explicitly reject Mobile App users and CRM users
    throw ApiError.forbidden(
      'Super admin access required. Mobile App and CRM user credentials cannot access Super Admin control center.'
    );
  } catch (error) {
    next(error);
  }
};

/** Mobile App only. Strictly validates that the caller is from the users table. */
export const requireAppUser: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) throw ApiError.unauthorized();

    const appUser = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, isActive: true },
    });

    if (!appUser || !appUser.isActive) {
      throw ApiError.forbidden(
        'Access denied: Mobile App user credentials required. Super Admin and CRM credentials cannot access mobile app resources.'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/** CRM only. Strictly validates that the caller is an active CRM user from crm_users table. */
export const requireCrmUser: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) throw ApiError.unauthorized();

    const crmUser = await prisma.crmUser.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, status: true },
    });

    if (!crmUser || (crmUser.status !== 'ACTIVE' && (crmUser.status as any) !== 'INVITED')) {
      throw ApiError.forbidden(
        'Access denied: CRM user credentials required. Mobile App and Super Admin credentials cannot access CRM.'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
