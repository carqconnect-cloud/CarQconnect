"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Role } from './crm/RoleContext';
import { getApiBaseUrl } from '../utils/apiBase';

// Demo credentials for each role
export const DEMO_CREDENTIALS = [
  { email: 'admin@fioner.test',    password: 'Password123',  role: 'ADMIN'     as Role, name: 'Admin User',      title: 'Administrator'  },
  { email: 'teamhead@fioner.test', password: 'Password123',  role: 'TEAM_HEAD' as Role, name: 'Team Head',       title: 'Team Head'      },
  { email: 'Employee@fioner.test', password: 'Password123',  role: 'EXECUTIVE' as Role, name: 'Executive Employee', title: 'Sales Executive'},
];

interface AuthUser {
  id: string;
  email: string;
  name: string;
  title: string;
  role: Role; 
  requirePasswordChange?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface CachedResponse {
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: number;
}

export const crmFastCache = new Map<string, CachedResponse>();
export const crmInflight = new Map<string, Promise<Response>>();

export function invalidateCrmCache(patternOrPrefix?: string) {
  if (!patternOrPrefix) {
    crmFastCache.clear();
    return;
  }
  for (const key of crmFastCache.keys()) {
    if (key.includes(patternOrPrefix)) {
      crmFastCache.delete(key);
    }
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const doLogout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fioner_auth_user');
    localStorage.removeItem('fioner_auth_token');
  }, []);

  React.useEffect(() => {
    const storedUser = localStorage.getItem('fioner_auth_user');
    const storedToken = localStorage.getItem('fioner_auth_token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        console.error('Failed to parse auth user from localStorage', e);
        doLogout();
      }
    } else {
      // If we have a user but no token (e.g. from previous mock auth), clear it out
      doLogout();
    }
    setIsLoading(false);
  }, []);

  // Global fetch interceptor for caching, fast SWR, auto-attaching auth token, and handling 401 Unauthorized
  React.useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let modifiedInit = init;
      const storedToken = typeof window !== 'undefined' ? (localStorage.getItem('fioner_auth_token') || localStorage.getItem('token')) : null;
      
      let resolvedInput: RequestInfo | URL = input;
      let urlStr = typeof input === 'string' 
        ? input 
        : input instanceof URL 
          ? input.toString() 
          : (input && typeof (input as any).url === 'string') ? (input as any).url : '';
      
      // If urlStr contains a comma-separated list of URLs (from an env string), cleanly rebase to active API URL
      if (urlStr.includes(',')) {
        const pathMatch = urlStr.match(/\/api\/v1\/.*$/);
        const apiPath = pathMatch ? pathMatch[0] : '';
        const cleanBase = getApiBaseUrl();
        const fixedUrl = apiPath ? `${cleanBase}${apiPath}` : urlStr.split(',')[0].trim();
        urlStr = fixedUrl;
        resolvedInput = fixedUrl;
      }
      
      const isAuthEndpoint = 
        urlStr.includes('/api/v1/auth/login') || 
        urlStr.includes('/api/v1/auth/register') || 
        urlStr.includes('/api/v1/auth/crm/login') ||
        urlStr.includes('/api/v1/auth/send-otp') ||
        urlStr.includes('/api/v1/auth/verify-otp') ||
        urlStr.includes('/api/v1/auth/reset-password');
      const method = (modifiedInit?.method || 'GET').toUpperCase();
      const isGet = method === 'GET';

      // Auto-attach bearer token if available and not explicitly provided or on public auth routes
      if (storedToken && !isAuthEndpoint) {
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${storedToken}`);
          modifiedInit = { ...init, headers };
        }
      }

      // Check SWR cache for GET requests
      let isBypass = false;
      if (isGet && !isAuthEndpoint && urlStr) {
        isBypass = Boolean(
          modifiedInit?.headers && (
            (modifiedInit.headers instanceof Headers && (modifiedInit.headers.get('x-cache-bypass') === 'true' || modifiedInit.headers.get('cache-control') === 'no-cache')) ||
            ((modifiedInit.headers as any)['x-cache-bypass'] === 'true' || (modifiedInit.headers as any)['cache-control'] === 'no-cache')
          )
        );

        // Strip internal client-only cache headers so they are NEVER sent across network to Render/servers
        if (modifiedInit?.headers) {
          if (modifiedInit.headers instanceof Headers) {
            modifiedInit.headers.delete('x-cache-bypass');
            modifiedInit.headers.delete('X-Cache-Bypass');
          } else if (typeof modifiedInit.headers === 'object') {
            delete (modifiedInit.headers as any)['x-cache-bypass'];
            delete (modifiedInit.headers as any)['X-Cache-Bypass'];
          }
        }

        if (!isBypass) {
          const cached = crmFastCache.get(urlStr);
          if (cached) {
            const age = Date.now() - cached.timestamp;
            // Fresh (< 30s) -> Instant return (0ms)
            if (age < 30000) {
              return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers: new Headers(cached.headers),
              });
            }
            // Stale (< 180s) -> Return stale immediately, revalidate silently in background!
            if (age < 180000) {
              if (!crmInflight.has(urlStr)) {
                const bgPromise = originalFetch(input, modifiedInit)
                  .then(async (bgRes) => {
                    if (bgRes.ok) {
                      const bodyText = await bgRes.clone().text();
                      const headerObj: Record<string, string> = {};
                      bgRes.headers.forEach((v, k) => { headerObj[k] = v; });
                      crmFastCache.set(urlStr, {
                        body: bodyText,
                        status: bgRes.status,
                        statusText: bgRes.statusText,
                        headers: headerObj,
                        timestamp: Date.now(),
                      });
                    }
                    return bgRes;
                  })
                  .catch(() => null)
                  .finally(() => {
                    crmInflight.delete(urlStr);
                  });
                crmInflight.set(urlStr, bgPromise as Promise<Response>);
              }

              return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers: new Headers(cached.headers),
              });
            }
          }
        }
      }

      // If mutation (POST/PUT/DELETE/PATCH), invalidate corresponding cache entries
      if (!isGet && !isAuthEndpoint && urlStr) {
        const cleanUrl = urlStr.split('?')[0];
        const segments = cleanUrl.split('/').filter(Boolean);
        const resource = segments[segments.length - 1] || segments[segments.length - 2];
        if (resource) {
          invalidateCrmCache(resource);
        }
        invalidateCrmCache('dashboard');
      }

      if (typeof window !== 'undefined' && !isAuthEndpoint) {
        window.dispatchEvent(new CustomEvent('fioner:fetch-start'));
      }

      let response: Response;
      try {
        response = await originalFetch(resolvedInput, modifiedInit);

        if (isGet && response.ok && !isAuthEndpoint && urlStr) {
          const cloned = response.clone();
          cloned.text().then((text) => {
            const headersObj: Record<string, string> = {};
            response.headers.forEach((v, k) => { headersObj[k] = v; });
            crmFastCache.set(urlStr, {
              body: text,
              status: response.status,
              statusText: response.statusText,
              headers: headersObj,
              timestamp: Date.now(),
            });
          }).catch(() => {});
        }
      } finally {
        if (typeof window !== 'undefined' && !isAuthEndpoint) {
          window.dispatchEvent(new CustomEvent('fioner:fetch-end'));
        }
      }

      // Only trigger logout on 401 if a token was sent and rejected by the server, and not on auth endpoints
      if (response.status === 401 && !isAuthEndpoint) {
        const sentAuth = modifiedInit?.headers instanceof Headers
          ? modifiedInit.headers.get('Authorization')
          : (modifiedInit?.headers as any)?.Authorization || (modifiedInit?.headers as any)?.authorization;
        
        if (sentAuth && storedToken) {
          doLogout();
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [doLogout]);

  /** Fetch wrapper that injects auth header and auto-logouts on 401. */
  const authedFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = localStorage.getItem('fioner_auth_token');
    const headers = new Headers(options.headers as HeadersInit);
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    if (!headers.has('X-Portal-Type')) {
      headers.set('X-Portal-Type', 'crm');
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      doLogout();
    }
    return res;
  }, [doLogout]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );
    const primaryApiUrl = getApiBaseUrl();

    const tryAuth = async (targetBase: string) => {
      return await fetch(`${targetBase}/api/v1/auth/crm/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Portal-Type': 'crm',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, portal: 'crm' })
      });
    };

    try {
      let res: Response;
      try {
        res = await tryAuth(primaryApiUrl);
      } catch (firstErr) {
        // If on localhost and primary failed (or vice-versa), attempt automatic fallback
        const fallbackUrl = primaryApiUrl.includes('localhost') || primaryApiUrl.includes('127.0.0.1')
          ? 'https://fioner-h5r7.onrender.com'
          : (isLocalhost ? 'http://localhost:4000' : null);

        if (fallbackUrl) {
          console.warn(`Primary auth URL (${primaryApiUrl}) unreachable. Attempting fallback (${fallbackUrl})...`);
          res = await tryAuth(fallbackUrl);
        } else {
          throw firstErr;
        }
      }
      
      const data = await res.json();
      
      if (res.ok && data.data?.tokens) {
        const match = DEMO_CREDENTIALS.find(c => c.email.toLowerCase() === email.toLowerCase());
        const orgRole = data.data.organizations?.[0]?.role;
        let finalRole: Role = 'ADMIN';
        if (orgRole === 'EXECUTIVE') finalRole = 'EXECUTIVE';
        else if (orgRole === 'TEAM_HEAD') finalRole = 'TEAM_HEAD';
        else if (orgRole === 'OWNER' || orgRole === 'ADMIN') finalRole = 'ADMIN';
        else if (match) finalRole = match.role;

        const authUser = { 
          id: data.data.user.id,
          email: data.data.user.email, 
          name: `${data.data.user.firstName || ''} ${data.data.user.lastName || ''}`.trim() || 'CRM User', 
          title: match?.title || (finalRole === 'EXECUTIVE' ? 'Executive' : finalRole === 'TEAM_HEAD' ? 'Team Head' : 'Administrator'), 
          role: finalRole,
          requirePasswordChange: !!data.data.requirePasswordChange 
        };
        
        setUser(authUser);
        setToken(data.data.tokens.accessToken);
        localStorage.setItem('fioner_auth_user', JSON.stringify(authUser));
        localStorage.setItem('fioner_auth_token', data.data.tokens.accessToken);
        
        return { success: true };
      }
      console.error('Login failed with response:', data);
      return { success: false, error: data.error?.message || data.message || 'Invalid email or password.' };
    } catch (err) {
      console.error('Login network/fetch error:', err);
      return { success: false, error: 'Network error. Could not reach server. Please ensure the backend is running on port 4000 or Render service is active.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout: doLogout, isAuthenticated: !!user, isLoading, token, authedFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
