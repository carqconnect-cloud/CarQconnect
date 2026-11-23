import type { CorsOptions } from 'cors';
import { env } from './env';

const ALLOWED_PRODUCTION_ORIGINS = [
  'https://fioner.vercel.app',
  'https://fioner-crm.vercel.app',
  'https://carqconnect.com',
  'https://www.carqconnect.com',
  'https://crm.carqconnect.com',
];

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow server-to-server / curl / Postman (no Origin header).
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Allow local network and mobile devices (LAN, WiFi, Hotspot, localhost)
    if (
      normalizedOrigin.startsWith('http://localhost') ||
      normalizedOrigin.startsWith('https://localhost') ||
      normalizedOrigin.startsWith('http://127.0.0.1') ||
      normalizedOrigin.startsWith('https://127.0.0.1') ||
      normalizedOrigin.startsWith('http://192.168.') ||
      normalizedOrigin.startsWith('https://192.168.') ||
      normalizedOrigin.startsWith('http://10.') ||
      normalizedOrigin.startsWith('https://10.') ||
      /^https?:\/\/(172\.(1[6-9]|2\d|3[01]))\./.test(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    // Allow all origins in development mode or if wildcard is configured
    if (env.isDev || env.corsOrigins.includes('*')) return callback(null, true);
    if (env.corsOrigins.includes(normalizedOrigin) || env.corsOrigins.includes(origin)) return callback(null, true);

    // Allow production Vercel frontend deployments and verified preview URLs
    if (
      ALLOWED_PRODUCTION_ORIGINS.includes(normalizedOrigin) ||
      /^https:\/\/fioner(-[a-z0-9_-]+)?\.vercel\.app$/.test(normalizedOrigin) ||
      /^https:\/\/([a-z0-9_-]+\.)?carqconnect\.com$/.test(normalizedOrigin) ||
      /^https:\/\/([a-z0-9_-]+\.)?fioner\.com$/.test(normalizedOrigin) ||
      /^https:\/\/([a-z0-9_-]+\.)?onrender\.com$/.test(normalizedOrigin) ||
      normalizedOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Organization-Id',
    'X-Request-Id',
    'X-Portal-Type',
    'x-portal-type',
    'X-Bypass-Rate-Limit',
    'x-bypass-rate-limit',
    'x-cache-bypass',
    'X-Cache-Bypass',
    'Cache-Control',
    'cache-control',
    'Accept',
    'Origin',
    'User-Agent',
  ],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400,
};

