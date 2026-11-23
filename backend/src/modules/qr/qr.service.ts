// -----------------------------------------------------------------------------
// Public QR Resolver Service
// SOW v1.0 §9.2; PRD v1.0 §6, §22
//
// Rules:
//  - Resolves by QR `code` string (NOT by database id).
//  - Only status=ACTIVE with a linked vehicleId resolves to vehicle data.
//  - All other statuses return the appropriate public state with null vehicle.
//  - REPLACED codes must not reveal the previous vehicle assignment.
//  - Owner contact details are never included in the response.
//  - Scans are logged only for codes that exist in the database.
//    Not-found codes are silently returned without a DB write to prevent
//    an unauthenticated write-based denial-of-service vector.
//  - Scan-log failures are swallowed so they never break public resolution.
//  - External integrations (Exotel, SMS, SOS dispatch) are not implemented;
//    their action flags are permanently false until separately authorised.
// -----------------------------------------------------------------------------

import { QrStatus } from '@prisma/client';
import { ApiError } from '../../common/utils/apiError';
import { adminQrRepository } from '../admin/qr/adminQr.repository';
import { qrRepository } from './qr.repository';

// The four statuses the public UI understands.
export type PublicQrStatus = 'active' | 'inactive' | 'suspended' | 'not_found';

export interface PublicQrVehicle {
  /** Vehicle registration number as stored (full, uppercase). */
  label: string;
  /** Vehicle make/model string. */
  model: string;
}

export interface PublicQrActions {
  /** Masked-calling via Exotel — not yet configured; always false. */
  call: boolean;
  /** Owner messaging — no delivery provider; always false. */
  message: boolean;
  /**
   * Report issue (wrongly-parked / damage etc.).
   * True only when a live vehicle assignment exists.
   * Requires an approved DB-backed reporting workflow; currently there is no
   * IssueReport model in the schema so this is informational only — the UI
   * should present a prompt and the endpoint validates + accepts the report.
   * If no backend endpoint exists yet, this remains false.
   */
  report: boolean;
  /** SOS dispatch — no integration; always false. */
  emergency: boolean;
}

export interface PublicQrResponse {
  /** The resolved QR code string (normalised, uppercase). */
  code: string;
  status: PublicQrStatus;
  /**
   * Populated only when status === 'active'.
   * Null for every other state, including REPLACED (prevents previous-
   * assignment data leakage).
   */
  vehicle: PublicQrVehicle | null;
  actions: PublicQrActions;
}

// ---------------------------------------------------------------------------
// Identifier validation
// QR codes follow the format produced by generateRandomQrCode():  "QRR-<6digits>"
// Custom-imported codes (from batch import) may differ in format.
// We apply a liberal pattern: 2-50 printable characters, alphanumeric + hyphens.
// This blocks obvious injection attempts without rejecting legitimate codes.
// ---------------------------------------------------------------------------
const QR_CODE_PATTERN = /^[A-Z0-9][A-Z0-9\-]{1,49}$/i;

/**
 * Map a raw DB QrStatus to the four public-facing values.
 * The mapping is deliberately conservative: anything that is not
 * a live ACTIVE-with-vehicle record collapses to 'inactive'.
 */
function toPublicStatus(status: QrStatus, vehicleId: string | null): PublicQrStatus {
  switch (status) {
    case QrStatus.ACTIVE:
      // Only qualify as active if a vehicle is actually linked.
      return vehicleId ? 'active' : 'inactive';
    case QrStatus.SUSPENDED:
      return 'suspended';
    case QrStatus.ASSIGNED:
    // Admin-assigned but owner has not yet activated; no public data.
    // falls through intentionally
    case QrStatus.AVAILABLE:
    case QrStatus.REPLACED:
    // REPLACED: vehicleId is null at DB level, but we re-enforce null below.
    // falls through intentionally
    case QrStatus.DEACTIVATED:
    default:
      return 'inactive';
  }
}

export const qrPublicService = {
  /**
   * Resolve a public QR code and return safe public data.
   *
   * @param rawCode  The code string extracted from the URL (un-normalised).
   * @param logData  Optional scan metadata for the QrScanLog record.
   */
  async resolve(
    rawCode: string,
    logData: { ipAddress?: string; userAgent?: string },
  ): Promise<PublicQrResponse> {
    const normalizedCode = rawCode.trim().toUpperCase();

    // Validate format before hitting the database.
    if (!QR_CODE_PATTERN.test(normalizedCode)) {
      throw ApiError.badRequest('Invalid QR code format');
    }

    const qr = await qrRepository.findByCode(normalizedCode);

    // Unknown code — return not_found without writing to the scan log.
    // Writing a scan log for every unknown code would create a DoS vector.
    if (!qr) {
      return {
        code: normalizedCode,
        status: 'not_found',
        vehicle: null,
        actions: { call: false, message: false, report: false, emergency: false },
      };
    }

    const publicStatus = toPublicStatus(qr.status, qr.vehicleId);
    const isActive = publicStatus === 'active';

    // Log scan for any code that exists in the database.
    // Fire-and-forget — failures must never block or corrupt the public response.
    adminQrRepository
      .recordScanLog(qr.id, qr.code, {
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent,
        actionTaken: 'VIEW',
      })
      .catch(() => {
        // Intentionally swallowed; scan logging is best-effort.
      });

    // Build the safe vehicle projection.
    // For non-active states (including REPLACED) vehicle is always null,
    // even if vehicleId is somehow still set, to prevent stale data leakage.
    const vehicle: PublicQrVehicle | null =
      isActive && qr.vehicle
        ? {
            label: qr.vehicle.reg.toUpperCase(),
            model: qr.vehicle.model,
          }
        : null;

    const actions: PublicQrActions = {
      call: false,      // Exotel masked calling: not implemented
      message: false,   // No messaging provider
      report: isActive, // Issue reporting is meaningful only for live vehicles
      emergency: false, // SOS dispatch: not implemented
    };

    return {
      code: qr.code,
      status: publicStatus,
      vehicle,
      actions,
    };
  },
};
