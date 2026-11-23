import { describe, expect, it } from 'vitest';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from '../src/common/utils/jwt';

describe('jwt utils', () => {
  it('round-trips an access token', () => {
    const token = signAccessToken({ sub: 'user_1', email: 'a@b.com', isSuperAdmin: false });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user_1');
    expect(payload.isSuperAdmin).toBe(false);
  });

  it('rejects a tampered token', () => {
    expect(() => verifyAccessToken('not.a.token')).toThrow();
  });

  it('hashes refresh tokens deterministically and never stores the raw value', () => {
    const { token, tokenHash } = generateRefreshToken();
    expect(tokenHash).toBe(hashRefreshToken(token));
    expect(tokenHash).not.toBe(token);
  });
});
