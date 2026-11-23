import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from './apiError';
import { ErrorCode } from '../constants/http';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  isSuperAdmin: boolean;
  isSubSuperAdmin?: boolean;
  userType?: 'superAdmin' | 'subSuperAdmin' | 'crmUser' | 'appUser';
  organizationId?: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    issuer: 'fioner-api',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'fioner-api' }) as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Access token expired', ErrorCode.TOKEN_EXPIRED);
    }
    throw ApiError.unauthorized('Invalid access token');
  }
}

/**
 * Refresh tokens are opaque random strings, not JWTs. Only a sha256 hash is
 * stored, so a database leak does not hand out working sessions.
 */
export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashRefreshToken(token), expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
