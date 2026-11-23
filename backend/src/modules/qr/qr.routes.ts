// -----------------------------------------------------------------------------
// Public QR Router — mounted at /qr under the public v1 router.
// The publicRateLimiter is applied at the router-mount level in routes/index.ts,
// NOT here, so it covers the entire /qr prefix including any future sub-routes.
// -----------------------------------------------------------------------------

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { qrController } from './qr.controller';

export const qrPublicRouter = Router();

/**
 * GET /api/v1/qr/:code
 * Anonymous public QR resolver.
 * No authentication required.
 * Protected by the publicRateLimiter at mount site (60 req/min per IP).
 */
qrPublicRouter.get('/:code', asyncHandler(qrController.resolve));
