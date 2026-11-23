/**
 * Fioner Control — Super Admin Authenticated API Client
 * ------------------------------------------------------------------
 * Provides type-safe HTTP communication with the Fioner backend API (/api/v1).
 * Features:
 * - Environment-configured Base URL with fallback to local backend (port 4000)
 * - Automatic Authorization: Bearer <token> injection
 * - Unified envelope handling for { success: true, data } and { success: false, error }
 * - Strong error normalization distinguishing 401 UNAUTHENTICATED, 403 FORBIDDEN,
 *   404 NOT_FOUND, 400 VALIDATION_ERROR, and network failures
 * - Zero secret leakage: credentials and tokens are sanitized from error messages
 */

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    [key: string]: unknown;
  };
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401 || this.code === 'UNAUTHENTICATED';
  }

  get isForbidden(): boolean {
    return this.statusCode === 403 || this.code === 'FORBIDDEN';
  }

  get isNotFound(): boolean {
    return this.statusCode === 404 || this.code === 'NOT_FOUND';
  }
}

const TOKEN_STORAGE_KEY = 'fioner_admin_token';
const REFRESH_TOKEN_STORAGE_KEY = 'fioner_admin_refresh_token';
const ADMIN_USER_STORAGE_KEY = 'fioner_admin_user';

// In-memory fallback for SSR / testing environments where window.localStorage is unavailable
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  memoryStore.set(key, value);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to store item in localStorage', e);
    }
  }
}

function removeStorageItem(key: string): void {
  memoryStore.delete(key);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
  }
}

function resolveBaseUrl(): string {
  let envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      envUrl = 'https://fioner-h5r7.onrender.com/api/v1';
    } else if (process.env.NODE_ENV === 'production') {
      envUrl = 'https://fioner-h5r7.onrender.com/api/v1';
    } else {
      return 'http://localhost:4000/api/v1';
    }
  }
  // If the env URL ends with /api/v1, use as is; if it ends with /api, append /v1; otherwise append /api/v1
  const trimmed = envUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }
  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}/api/v1`;
}

interface CacheEntry<T = any> {
  data: T;
  meta?: any;
  timestamp: number;
}

class ApiClient {
  private baseUrl: string;
  private unauthorizedListeners: Array<() => void> = [];
  private memoryCache = new Map<string, CacheEntry>();
  private inflightRequests = new Map<string, Promise<{ data: any; meta?: any }>>();

  constructor() {
    this.baseUrl = resolveBaseUrl();
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getToken(): string | null {
    return getStorageItem(TOKEN_STORAGE_KEY);
  }

  public setToken(token: string): void {
    setStorageItem(TOKEN_STORAGE_KEY, token);
  }

  public getRefreshToken(): string | null {
    return getStorageItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  public setRefreshToken(token: string): void {
    setStorageItem(REFRESH_TOKEN_STORAGE_KEY, token);
  }

  public getAdminUser(): any | null {
    const raw = getStorageItem(ADMIN_USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public setAdminUser(user: any): void {
    setStorageItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
  }

  public clearAuth(): void {
    removeStorageItem(TOKEN_STORAGE_KEY);
    removeStorageItem(REFRESH_TOKEN_STORAGE_KEY);
    removeStorageItem(ADMIN_USER_STORAGE_KEY);
  }

  public onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.push(listener);
    return () => {
      this.unauthorizedListeners = this.unauthorizedListeners.filter((l) => l !== listener);
    };
  }

  private notifyUnauthorized(): void {
    for (const listener of this.unauthorizedListeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in unauthorized listener', e);
      }
    }
  }

  private refreshPromise: Promise<string | null> | null = null;

  public async refreshTokens(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          this.clearAuth();
          return null;
        }

        const payload = await res.json();
        const tokens = payload?.data?.tokens || payload?.tokens;
        if (tokens?.accessToken) {
          this.setToken(tokens.accessToken);
          if (tokens.refreshToken) {
            this.setRefreshToken(tokens.refreshToken);
          }
          return tokens.accessToken as string;
        }

        this.clearAuth();
        return null;
      } catch {
        this.clearAuth();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public invalidateCache(prefixOrPattern?: string | RegExp): void {
    if (!prefixOrPattern) {
      this.memoryCache.clear();
      return;
    }
    const isStr = typeof prefixOrPattern === 'string';
    for (const key of this.memoryCache.keys()) {
      if (isStr ? key.startsWith(prefixOrPattern) || key.includes(prefixOrPattern) : prefixOrPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  public clearCache(): void {
    this.memoryCache.clear();
    this.inflightRequests.clear();
  }

  private autoInvalidateFor(path: string): void {
    const clean = path.startsWith('/') ? path : `/${path}`;
    const segments = clean.split('/').filter(Boolean);
    const root = segments[1] || segments[0] || '';
    if (root) {
      this.invalidateCache(root);
    }
    this.invalidateCache('dashboard');
  }

  private triggerBackgroundRevalidate(endpoint: string, options: any, cacheKey: string): void {
    if (this.inflightRequests.has(cacheKey)) return;
    const p = this.executeFetch(endpoint, { ...options, forceRefresh: true })
      .then((res) => {
        this.memoryCache.set(cacheKey, { data: res.data, meta: res.meta, timestamp: Date.now() });
        return res;
      })
      .catch(() => null);
    this.inflightRequests.set(cacheKey, p as Promise<any>);
    p.finally(() => this.inflightRequests.delete(cacheKey));
  }

  /**
   * Internal request dispatcher with token injection and response envelope unwrapping.
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit & { params?: Record<string, any>; _isRetry?: boolean; forceRefresh?: boolean } = {},
  ): Promise<{ data: T; meta?: any }> {
    const { params, forceRefresh, ...fetchOptions } = options;
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const isGet = method === 'GET';

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const paramEntries = params ? Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '') : [];
    const qs = paramEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    const cacheKey = `${cleanEndpoint}?${qs}`;

    if (isGet && !forceRefresh) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < 30000) {
          return { data: cached.data as T, meta: cached.meta };
        }
        if (age < 180000) {
          this.triggerBackgroundRevalidate(endpoint, options, cacheKey);
          return { data: cached.data as T, meta: cached.meta };
        }
      }

      const inflight = this.inflightRequests.get(cacheKey);
      if (inflight) {
        return inflight as Promise<{ data: T; meta?: any }>;
      }
    }

    if (isGet) {
      const inflightPromise = this.executeFetch<T>(endpoint, options)
        .then((res) => {
          this.memoryCache.set(cacheKey, { data: res.data, meta: res.meta, timestamp: Date.now() });
          return res;
        })
        .finally(() => {
          this.inflightRequests.delete(cacheKey);
        });
      this.inflightRequests.set(cacheKey, inflightPromise);
      return inflightPromise;
    }

    return this.executeFetch<T>(endpoint, options);
  }

  private async executeFetch<T>(
    endpoint: string,
    options: RequestInit & { params?: Record<string, any>; _isRetry?: boolean } = {},
  ): Promise<{ data: T; meta?: any }> {
    const { params, headers: customHeaders, _isRetry, ...fetchOptions } = options;

    // Construct full URL with optional query parameters
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}${cleanEndpoint}`;

    // For coupon endpoints in local development, direct straight to local backend to prevent 404 console noise from un-deployed cloud instances
    if (
      (cleanEndpoint.startsWith('/coupons') || cleanEndpoint.startsWith('/admin/coupons')) &&
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      url = `http://localhost:4000/api/v1${cleanEndpoint.replace('/admin/coupons', '/coupons')}`;
    }

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Portal-Type': 'super-admin',
      ...(customHeaders as Record<string, string>),
    };

    if (!(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // If remote returned 404 or failed and we're on localhost, try the local backend directly!
      if (
        response.status === 404 &&
        !url.includes('localhost:4000') &&
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        const localUrl = `http://localhost:4000/api/v1${cleanEndpoint}` + (params ? `?${new URLSearchParams(params).toString()}` : '');
        try {
          let localRes = await fetch(localUrl, { ...fetchOptions, headers });
          if (!localRes.ok && cleanEndpoint.startsWith('/admin/coupons')) {
            const pubUrl = localUrl.replace('/admin/coupons', '/coupons');
            const pubRes = await fetch(pubUrl, { ...fetchOptions, headers });
            if (pubRes.ok) localRes = pubRes;
          }
          if (localRes.ok) {
            response = localRes;
          }
        } catch (_) {}
      }
    } catch (networkError: any) {
      if (
        !url.includes('localhost:4000') &&
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        const localUrl = `http://localhost:4000/api/v1${cleanEndpoint}` + (params ? `?${new URLSearchParams(params).toString()}` : '');
        try {
          let localRes = await fetch(localUrl, { ...fetchOptions, headers });
          if (!localRes.ok && cleanEndpoint.startsWith('/admin/coupons')) {
            const pubUrl = localUrl.replace('/admin/coupons', '/coupons');
            const pubRes = await fetch(pubUrl, { ...fetchOptions, headers });
            if (pubRes.ok) localRes = pubRes;
          }
          if (localRes.ok) {
            response = localRes;
          } else {
            throw new ApiError(
              networkError?.message || 'Network request failed. Ensure the Fioner backend is running.',
              0,
              'NETWORK_ERROR',
            );
          }
        } catch (_) {
          throw new ApiError(
            networkError?.message || 'Network request failed. Ensure the Fioner backend is running.',
            0,
            'NETWORK_ERROR',
          );
        }
      } else {
        throw new ApiError(
          networkError?.message || 'Network request failed. Ensure the Fioner backend is running.',
          0,
          'NETWORK_ERROR',
        );
      }
    }

    // Attempt to parse JSON response body
    let payload: any;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    } else {
      payload = await response.text();
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined as unknown as T };
    }

    // Error handling
    if (!response.ok || (payload && payload.success === false)) {
      const errorObj = payload?.error;
      let message =
        errorObj?.message ||
        (typeof payload === 'string' ? payload : null) ||
        payload?.message ||
        response.statusText ||
        'API request failed';
      const code = errorObj?.code || `HTTP_${response.status}`;
      const details = errorObj?.details;

      if (details && Array.isArray(details) && details.length > 0) {
        const detailList = details
          .map((d: any) => d.message || d.msg || (typeof d === 'string' ? d : ''))
          .filter(Boolean);
        if (detailList.length > 0) {
          message = detailList.join('. ');
        }
      } else if (details && typeof details === 'object') {
        const detailVals = Object.values(details)
          .flat()
          .map((v: any) => v?.message || v?.msg || (typeof v === 'string' ? v : ''))
          .filter(Boolean);
        if (detailVals.length > 0) {
          message = detailVals.join('. ');
        }
      }

      if (response.status === 401) {
        if (!_isRetry && !cleanEndpoint.startsWith('/auth/')) {
          const newToken = await this.refreshTokens();
          if (newToken) {
            return await this.request<T>(endpoint, { ...options, _isRetry: true });
          }
        }
        this.notifyUnauthorized();
      }

      throw new ApiError(message, response.status, code, details);
    }

    // Standard Fioner response envelope unwrapping
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return {
        data: payload.data as T,
        meta: payload.meta,
      };
    }

    // Raw payload fallback
    return { data: payload as T };
  }

  public async get<T>(
    path: string,
    params?: Record<string, any>,
    options?: RequestInit & { forceRefresh?: boolean },
  ): Promise<T> {
    const res = await this.request<T>(path, { method: 'GET', params, ...options });
    return res.data;
  }

  public async getWithMeta<T>(
    path: string,
    params?: Record<string, any>,
    options?: RequestInit & { forceRefresh?: boolean },
  ): Promise<{ data: T; meta?: any }> {
    return this.request<T>(path, { method: 'GET', params, ...options });
  }

  public async post<T>(path: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    this.autoInvalidateFor(path);
    return res.data;
  }

  public async put<T>(path: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    this.autoInvalidateFor(path);
    return res.data;
  }

  public async patch<T>(path: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    this.autoInvalidateFor(path);
    return res.data;
  }

  public async delete<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(path, { method: 'DELETE', ...options });
    this.autoInvalidateFor(path);
    return res.data;
  }

  /**
   * Super Admin authentication via /auth/login.
   */
  public async login(
    email: string,
    password: string,
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    const res = await this.post<{
      user: any;
      tokens: { accessToken: string; refreshToken: string };
      organizations?: any[];
    }>('/auth/admin/login', { email, password, portal: 'super-admin' });

    if (!res.user.isSuperAdmin && !res.user.isSubSuperAdmin) {
      this.clearAuth();
      throw new ApiError('Access denied. Administrator privileges required.', 403, 'FORBIDDEN');
    }

    this.setToken(res.tokens.accessToken);
    this.setRefreshToken(res.tokens.refreshToken);
    this.setAdminUser(res.user);

    return res;
  }

  /**
   * Super Admin Self-Registration via /auth/admin/register.
   */
  public async adminRegister(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    securityKey: string;
  }): Promise<{ message: string; superAdmin: any }> {
    return this.post<{ message: string; superAdmin: any }>('/auth/admin/register', data);
  }

  /**
   * Check whether a Super Admin has already been registered on the platform.
   */
  public async getAdminStatus(): Promise<{ hasSuperAdmin: boolean }> {
    try {
      return await this.get<{ hasSuperAdmin: boolean }>('/auth/admin/status');
    } catch {
      return { hasSuperAdmin: false };
    }
  }

  /**
   * Sub-Super Admin Team Management (Super Admin only).
   */
  public async getSubAdmins(): Promise<any[]> {
    return this.get<any[]>('/admin/sub-admins');
  }

  public async createSubAdmin(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    roleTitle?: string;
    permissions?: any;
  }): Promise<any> {
    return this.post<any>('/admin/sub-admins', data);
  }

  public async deleteSubAdmin(id: string): Promise<void> {
    return this.delete<void>(`/admin/sub-admins/${id}`);
  }
}

export const apiClient = new ApiClient();

