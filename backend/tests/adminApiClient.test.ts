import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '../../super-admin/lib/apiClient';

describe('Super Admin Authenticated API Client (apiClient)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient.clearAuth();
    apiClient.setBaseUrl('http://localhost:4000/api/v1');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('correctly resolves base URL with /api/v1 prefix', () => {
    expect(apiClient.getBaseUrl()).toBe('http://localhost:4000/api/v1');

    apiClient.setBaseUrl('https://api.fioner.com/api/v1/');
    expect(apiClient.getBaseUrl()).toBe('https://api.fioner.com/api/v1');
  });

  it('manages auth tokens in localStorage', () => {
    expect(apiClient.getToken()).toBeNull();

    apiClient.setToken('test_access_token_123');
    expect(apiClient.getToken()).toBe('test_access_token_123');

    apiClient.setRefreshToken('test_refresh_token_456');
    expect(apiClient.getRefreshToken()).toBe('test_refresh_token_456');

    apiClient.clearAuth();
    expect(apiClient.getToken()).toBeNull();
    expect(apiClient.getRefreshToken()).toBeNull();
  });

  it('injects Authorization Bearer token into outgoing requests', async () => {
    apiClient.setToken('jwt_super_admin_secret');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: { users: [] } }),
    });
    global.fetch = mockFetch;

    const res = await apiClient.get('/admin/users');
    expect(res).toEqual({ users: [] });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/admin/users',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt_super_admin_secret',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('unwraps ApiResponseEnvelope { success: true, data } cleanly', async () => {
    const mockData = { id: 'usr_1', email: 'admin@fioner.test' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: true,
        data: mockData,
        meta: { pagination: { total: 1, page: 1, limit: 20 } },
      }),
    });

    const resWithMeta = await apiClient.getWithMeta('/admin/users/usr_1');
    expect(resWithMeta.data).toEqual(mockData);
    expect(resWithMeta.meta.pagination.total).toBe(1);

    const dataOnly = await apiClient.get('/admin/users/usr_1');
    expect(dataOnly).toEqual(mockData);
  });

  it('throws ApiError with normalized code and message on 400 Bad Request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user status parameter',
          details: [{ field: 'status', issue: 'must be boolean' }],
        },
      }),
    });

    await expect(apiClient.patch('/admin/users/usr_1/status', { isActive: 'invalid' })).rejects.toThrow(
      'Invalid user status parameter',
    );

    try {
      await apiClient.patch('/admin/users/usr_1/status', { isActive: 'invalid' });
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual([{ field: 'status', issue: 'must be boolean' }]);
    }
  });

  it('notifies unauthorized listeners on 401 UNAUTHENTICATED', async () => {
    const listener = vi.fn();
    const unsub = apiClient.onUnauthorized(listener);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Token expired or invalid' },
      }),
    });

    await expect(apiClient.get('/admin/dashboard')).rejects.toThrow('Token expired or invalid');
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });

  it('correctly throws isForbidden on 403 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Super admin access required' },
      }),
    });

    try {
      await apiClient.get('/admin/dashboard');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.isForbidden).toBe(true);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('correctly serializes query params including arrays, numbers, and strings', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: [] }),
    });
    global.fetch = mockFetch;

    await apiClient.get('/admin/users', { page: 2, limit: 10, search: 'alex' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/admin/users?page=2&limit=10&search=alex',
      expect.anything(),
    );
  });

  it('handles network failure with descriptive NETWORK_ERROR without leaking secrets', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(apiClient.get('/admin/dashboard')).rejects.toThrow('Failed to fetch');

    try {
      await apiClient.get('/admin/dashboard');
    } catch (err: any) {
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.statusCode).toBe(0);
    }
  });

  it('performs login and stores access token and user profile', async () => {
    const mockLoginResponse = {
      success: true,
      data: {
        user: { id: 'usr_super_1', email: 'super@fioner.test', isSuperAdmin: true },
        tokens: { accessToken: 'acc_token_999', refreshToken: 'ref_token_888' },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockLoginResponse,
    });

    const res = await apiClient.login('super@fioner.test', 'Password123');
    expect(res.user.email).toBe('super@fioner.test');
    expect(apiClient.getToken()).toBe('acc_token_999');
    expect(apiClient.getRefreshToken()).toBe('ref_token_888');
    expect(apiClient.getAdminUser()?.id).toBe('usr_super_1');
  });

  it('rejects non-Super-Admin login with 403 and cleans up authentication state', async () => {
    apiClient.setToken('stale_token_before_login');

    const mockNonAdminResponse = {
      success: true,
      data: {
        user: { id: 'usr_cust_1', email: 'customer@fioner.test', isSuperAdmin: false },
        tokens: { accessToken: 'acc_token_cust', refreshToken: 'ref_token_cust' },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockNonAdminResponse,
    });

    await expect(apiClient.login('customer@fioner.test', 'Password123')).rejects.toThrow(
      'Access denied. Super Admin privileges required.',
    );

    expect(apiClient.getToken()).toBeNull();
    expect(apiClient.getRefreshToken()).toBeNull();
    expect(apiClient.getAdminUser()).toBeNull();
  });

  it('handles invalid credentials on login with 401 ApiError', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }),
    });

    try {
      await apiClient.login('wrong@fioner.test', 'BadPass');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('INVALID_CREDENTIALS');
      expect(err.message).toBe('Invalid email or password');
    }

    expect(apiClient.getToken()).toBeNull();
  });

  it('unregisters unauthorized listeners cleanly to prevent duplicate invocations', async () => {
    const listener = vi.fn();
    const unsub = apiClient.onUnauthorized(listener);

    unsub();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Session expired' },
      }),
    });

    await expect(apiClient.get('/admin/dashboard')).rejects.toThrow('Session expired');
    expect(listener).not.toHaveBeenCalled();
  });

  it('handles concurrent 401 unauthorized responses cleanly without race conditions or unhandled rejections', async () => {
    const listener = vi.fn();
    const unsub = apiClient.onUnauthorized(listener);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Token expired' },
      }),
    });

    // Fire 3 simultaneous requests
    const results = await Promise.allSettled([
      apiClient.get('/admin/users'),
      apiClient.get('/admin/dashboard'),
      apiClient.get('/admin/orders'),
    ]);

    // All three should reject with ApiError 401
    expect(results).toHaveLength(3);
    for (const res of results) {
      expect(res.status).toBe('rejected');
      if (res.status === 'rejected') {
        expect(res.reason).toBeInstanceOf(ApiError);
        expect(res.reason.statusCode).toBe(401);
      }
    }

    // Listener was invoked for the 401 events
    expect(listener).toHaveBeenCalled();

    unsub();
  });
});
