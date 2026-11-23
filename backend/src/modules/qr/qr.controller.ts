// -----------------------------------------------------------------------------
// Public QR Controller — handles GET /qr/:code (anonymous, no auth required).
// -----------------------------------------------------------------------------

import type { Request, Response } from 'express';
import { ApiResponse } from '../../common/utils/apiResponse';
import { qrPublicService } from './qr.service';

export const qrController = {
  /**
   * GET /api/v1/qr/:code
   * Public resolver — no authentication required.
   * Returns a safe, minimal public record for the scanned QR code.
   */
  async resolve(req: Request, res: Response) {
    const { code } = req.params as { code: string };

    const result = await qrPublicService.resolve(code, {
      // req.ip is already trusted because app sets `trust proxy 1`
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });

    return ApiResponse.ok(res, result);
  },
};
