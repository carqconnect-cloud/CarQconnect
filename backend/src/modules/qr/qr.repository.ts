// -----------------------------------------------------------------------------
// Public QR Repository — read-only, minimal projection.
// Used exclusively by the anonymous public resolver.
// NEVER include owner contact details, internal user IDs, or
// private vehicle fields in this projection.
// -----------------------------------------------------------------------------

import { prisma } from '../../config/database';

export const qrRepository = {
  /**
   * Find a QR code by its public code value (e.g. "QRR-123456").
   * Returns only fields required for anonymous public resolution.
   * The vehicle sub-select deliberately excludes userId, user data,
   * documents, and GPS information so no owner enumeration is possible.
   */
  async findByCode(code: string) {
    return prisma.qrCode.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        code: true,
        status: true,
        vehicleId: true,
        vehicle: {
          select: {
            reg: true,
            model: true,
            // userId intentionally omitted — no owner lookup possible
          },
        },
      },
    });
  },
};
