import type { Request, Response, NextFunction, RequestHandler } from 'express';

interface CacheEntry<T = unknown> {
  data: T;
  contentType: string;
  expiresAt: number;
}

class FastMemoryCache {
  private cache = new Map<string, CacheEntry>();
  private sweepInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodic sweep every 60 seconds to prune expired keys and prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      this.sweepInterval = setInterval(() => this.prune(), 60000);
      if (this.sweepInterval.unref) {
        this.sweepInterval.unref();
      }
    }
  }

  public get<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  public getEntry(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }

  public set<T = unknown>(key: string, data: T, ttlSeconds: number, contentType: string = 'application/json'): void {
    const expiresAt = Date.now() + Math.max(ttlSeconds, 1) * 1000;
    this.cache.set(key, { data, contentType, expiresAt });
  }

  public del(key: string): void {
    this.cache.delete(key);
  }

  public delPattern(pattern: string | RegExp): void {
    const isString = typeof pattern === 'string';
    for (const key of this.cache.keys()) {
      if (isString ? key.includes(pattern) : pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const fastCache = new FastMemoryCache();

export function invalidateFastCache(pattern: string | RegExp): void {
  fastCache.delPattern(pattern);
}

/**
 * Express middleware for fast caching of GET requests.
 * @param ttlSeconds Time-to-live in seconds (default: 30)
 * @param prefix Optional prefix to isolate entity types (e.g., 'crm:dash')
 */
export function cacheResponse(ttlSeconds = 30, prefix = 'cache'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Bypass cache if client explicitly asks
    const bypassHeader = req.headers['x-cache-bypass'] || req.headers['cache-control'];
    if (
      bypassHeader === 'true' ||
      bypassHeader === 'no-cache' ||
      req.query.refresh === 'true' ||
      req.query._fresh === 'true'
    ) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    const orgId = req.tenant?.organizationId || (req as any).user?.organizationId || '';
    const userId = (req as any).user?.id || 'anon';
    const cacheKey = `${prefix}:${orgId}:${userId}:${req.originalUrl}`;

    const cached = fastCache.getEntry(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `private, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);
      res.setHeader('Content-Type', cached.contentType);
      res.send(cached.data);
      return;
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', `private, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function (body: any): Response {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        fastCache.set(cacheKey, JSON.stringify(body), ttlSeconds, 'application/json');
      }
      return originalJson(body);
    };

    res.send = function (body: any): Response {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const ct = res.getHeader('Content-Type');
        const contentType = typeof ct === 'string' ? ct : 'application/json';
        fastCache.set(cacheKey, body, ttlSeconds, contentType);
      }
      return originalSend(body);
    };

    next();
  };
}
