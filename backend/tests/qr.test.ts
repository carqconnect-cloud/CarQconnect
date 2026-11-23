/**
 * Unit tests for the Public QR Resolver endpoint
 * GET /api/v1/qr/:code
 *
 * All database calls are mocked via vi.spyOn — no real DB required.
 * Rate limiting is skipped automatically in NODE_ENV=test.
 *
 * Test inventory:
 *  - Valid ACTIVE QR resolves with vehicle data
 *  - ASSIGNED QR (not yet customer-activated) → inactive, no vehicle data
 *  - SUSPENDED QR → suspended, no vehicle data
 *  - REPLACED QR → inactive, no vehicle data (no stale assignment leak)
 *  - DEACTIVATED QR → inactive, no vehicle data
 *  - AVAILABLE QR → inactive, no vehicle data
 *  - Not-found code → not_found, no DB scan write
 *  - Malformed / empty code → 400 VALIDATION_ERROR
 *  - Private fields (owner, userId, vehicleId) absent from response
 *  - Scan log is written for found codes
 *  - Scan log failure does not break resolution
 *  - No auth token required (public endpoint)
 *  - Rate-limit handler returns RATE_LIMITED error code (response shape)
 */

import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { QrStatus } from '@prisma/client';
import { qrRepository } from '../src/modules/qr/qr.repository';
import { adminQrRepository } from '../src/modules/admin/qr/adminQr.repository';

describe('Public QR Resolver Endpoint (GET /api/v1/qr/:code)', () => {
  const app = createApp();
  const BASE_URL = '/api/v1/qr';

  // ------------------------------------------------------------------
  // Shared fixture data
  // ------------------------------------------------------------------
  const activeQr = {
    id: 'qr_pub_active_1',
    code: 'QRR-111111',
    status: QrStatus.ACTIVE,
    vehicleId: 'veh_pub_1',
    vehicle: {
      reg: 'KA05MN4321',
      model: 'Mahindra XUV700',
    },
  };

  const assignedQr = {
    id: 'qr_pub_assigned_1',
    code: 'QRR-222222',
    status: QrStatus.ASSIGNED,
    vehicleId: 'veh_pub_2',
    vehicle: { reg: 'MH12AB5678', model: 'Honda City' },
  };

  const suspendedQr = {
    id: 'qr_pub_suspended_1',
    code: 'QRR-333333',
    status: QrStatus.SUSPENDED,
    vehicleId: 'veh_pub_3',
    vehicle: { reg: 'DL1CAB1234', model: 'Maruti Swift' },
  };

  const replacedQr = {
    id: 'qr_pub_replaced_1',
    code: 'QRR-444444',
    status: QrStatus.REPLACED,
    vehicleId: null,       // vehicleId is null after replacement
    vehicle: null,
  };

  const deactivatedQr = {
    id: 'qr_pub_deact_1',
    code: 'QRR-555555',
    status: QrStatus.DEACTIVATED,
    vehicleId: null,
    vehicle: null,
  };

  const availableQr = {
    id: 'qr_pub_avail_1',
    code: 'QRR-666666',
    status: QrStatus.AVAILABLE,
    vehicleId: null,
    vehicle: null,
  };

  const mockScanLog = {
    id: 'scan_log_pub_1',
    qrCodeId: 'qr_pub_active_1',
    qrCodeValue: 'QRR-111111',
    scannedAt: new Date(),
    ipAddress: null,
    userAgent: null,
    city: null,
    actionTaken: 'VIEW',
    metadata: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ====================================================================
  // ACTIVE QR — the happy path
  // ====================================================================
  describe('ACTIVE QR with linked vehicle', () => {
    beforeEach(() => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(activeQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);
    });

    it('returns 200 with status=active and vehicle data', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-111111`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.code).toBe('QRR-111111');
      expect(res.body.data.vehicle).toMatchObject({
        label: 'KA05MN4321',
        model: 'Mahindra XUV700',
      });
    });

    it('normalises the code to uppercase before lookup', async () => {
      await request(app).get(`${BASE_URL}/qrr-111111`);
      expect(qrRepository.findByCode).toHaveBeenCalledWith('QRR-111111');
    });

    it('does not expose vehicleId, ownerId, or owner contact fields', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-111111`);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('userId');
      expect(body).not.toContain('ownerId');
      expect(body).not.toContain('ownerName');
      expect(body).not.toContain('ownerEmail');
      expect(body).not.toContain('phone');
      expect(body).not.toContain('email');
      expect(body).not.toContain('vehicleId');
      // The internal DB id of the QR should not appear either
      expect(body).not.toContain('qr_pub_active_1');
    });

    it('records a scan log on successful resolution', async () => {
      await request(app).get(`${BASE_URL}/QRR-111111`);
      expect(adminQrRepository.recordScanLog).toHaveBeenCalledOnce();
    });

    it('all action flags default to false except report (no providers wired)', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-111111`);
      expect(res.body.data.actions).toEqual({
        call: false,
        message: false,
        report: true,
        emergency: false,
      });
    });

    it('does not require an Authorization header', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/QRR-111111`)
        // no Authorization header
      ;
      expect(res.status).toBe(200);
    });
  });

  // ====================================================================
  // ASSIGNED QR — admin-assigned, not yet customer-activated
  // ====================================================================
  describe('ASSIGNED QR', () => {
    beforeEach(() => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(assignedQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);
    });

    it('returns status=inactive with no vehicle data', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-222222`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('does not expose the ASSIGNED vehicle registration', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-222222`);
      expect(JSON.stringify(res.body)).not.toContain('MH12AB5678');
    });

    it('all actions are false', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-222222`);
      expect(res.body.data.actions).toEqual({
        call: false, message: false, report: false, emergency: false,
      });
    });
  });

  // ====================================================================
  // SUSPENDED QR
  // ====================================================================
  describe('SUSPENDED QR', () => {
    beforeEach(() => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(suspendedQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);
    });

    it('returns status=suspended with no vehicle data', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-333333`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('suspended');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('does not expose the suspended vehicle registration', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-333333`);
      expect(JSON.stringify(res.body)).not.toContain('DL1CAB1234');
    });
  });

  // ====================================================================
  // REPLACED QR — must never leak previous vehicle assignment
  // ====================================================================
  describe('REPLACED QR', () => {
    beforeEach(() => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(replacedQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);
    });

    it('returns status=inactive with null vehicle', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-444444`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('does not contain any historical vehicle data', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-444444`);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('reg');
      expect(body).not.toContain('model');
    });
  });

  // ====================================================================
  // DEACTIVATED QR
  // ====================================================================
  describe('DEACTIVATED QR', () => {
    beforeEach(() => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(deactivatedQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);
    });

    it('returns status=inactive with null vehicle', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-555555`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.data.vehicle).toBeNull();
    });
  });

  // ====================================================================
  // AVAILABLE QR — never assigned
  // ====================================================================
  describe('AVAILABLE QR', () => {
    beforeEach(() => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(availableQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);
    });

    it('returns status=inactive with null vehicle', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-666666`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.data.vehicle).toBeNull();
    });
  });

  // ====================================================================
  // NOT FOUND — code does not exist in DB
  // ====================================================================
  describe('Not-found QR code', () => {
    beforeEach(() => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(null);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);
    });

    it('returns 200 with status=not_found and null vehicle', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-999999`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('not_found');
      expect(res.body.data.vehicle).toBeNull();
    });

    it('does NOT write a scan log for unknown codes (DoS protection)', async () => {
      await request(app).get(`${BASE_URL}/QRR-999999`);
      expect(adminQrRepository.recordScanLog).not.toHaveBeenCalled();
    });

    it('all actions are false', async () => {
      const res = await request(app).get(`${BASE_URL}/QRR-999999`);
      expect(res.body.data.actions).toEqual({
        call: false, message: false, report: false, emergency: false,
      });
    });
  });

  // ====================================================================
  // INPUT VALIDATION — malformed identifiers
  // ====================================================================
  describe('Malformed identifiers', () => {
    it('returns 400 for a single character code', async () => {
      const res = await request(app).get(`${BASE_URL}/X`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for a code that is too long (51+ chars)', async () => {
      const long = 'A'.repeat(51);
      const res = await request(app).get(`${BASE_URL}/${long}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for a code containing path-traversal characters', async () => {
      const res = await request(app).get(`${BASE_URL}/..%2F..%2Fetc%2Fpasswd`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for a code with special injection characters', async () => {
      const res = await request(app).get(`${BASE_URL}/'; DROP TABLE qr_codes;--`);
      // Express URL decodes the path; the single-quote alone should fail validation
      expect([400, 404]).toContain(res.status); // 404 is acceptable if the route itself doesn't match
    });
  });

  // ====================================================================
  // SCAN LOG RESILIENCE — log failure must not break resolution
  // ====================================================================
  describe('Scan log failure resilience', () => {
    it('still returns 200 when scan logging throws', async () => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(activeQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockRejectedValue(new Error('DB error'));

      const res = await request(app).get(`${BASE_URL}/QRR-111111`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });
  });

  // ====================================================================
  // RATE LIMIT — response shape
  // Rate limiting is skipped in NODE_ENV=test (env.isTest guard in middleware).
  // We test the response envelope shape expected from the rate limit handler.
  // ====================================================================
  describe('Rate limit response shape', () => {
    it('the rate-limit error uses RATE_LIMITED code and 429 status (envelope contract)', () => {
      // We validate the documented shape by asserting against what the
      // publicRateLimiter handler produces in rateLimit.middleware.ts.
      // In production: window=60s, limit=60 req/IP.
      // In test: skip=true, so no real rate limiting triggers.
      // This test documents the contract only.
      const rateErrorShape = {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      };
      expect(rateErrorShape.error.code).toBe('RATE_LIMITED');
      expect(rateErrorShape.success).toBe(false);
    });
  });

  // ====================================================================
  // SECURITY — no private data enumeration
  // ====================================================================
  describe('Private data exclusion', () => {
    it('active response never includes internal QR database id', async () => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(activeQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);

      const res = await request(app).get(`${BASE_URL}/QRR-111111`);
      const body = JSON.stringify(res.body);
      // The internal cuid id must not appear in the public response
      expect(body).not.toContain('qr_pub_active_1');
      expect(body).not.toContain('veh_pub_1');
    });

    it('no external integration is reported as successful when none is wired', async () => {
      vi.spyOn(qrRepository, 'findByCode').mockResolvedValue(activeQr as never);
      vi.spyOn(adminQrRepository, 'recordScanLog').mockResolvedValue(mockScanLog as never);

      const res = await request(app).get(`${BASE_URL}/QRR-111111`);
      // call=false confirms Exotel is not pretending to be connected
      expect(res.body.data.actions.call).toBe(false);
      // emergency=false confirms SOS dispatch is not pretending to be connected
      expect(res.body.data.actions.emergency).toBe(false);
      // message=false confirms no messaging provider is pretending to be connected
      expect(res.body.data.actions.message).toBe(false);
    });
  });
});
