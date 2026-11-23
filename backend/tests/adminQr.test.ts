import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminQrRepository } from '../src/modules/admin/qr/adminQr.repository';
import { QrStatus } from '@prisma/client';

describe('Super Admin QR Code Management Endpoints (/api/v1/admin/qr/*)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'admin_qr_test_1',
    email: 'superadmin_qr@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: 'regular_cust_1',
    email: 'regular_cust@fioner.test',
    isSuperAdmin: false,
  });

  const mockDbQr = {
    id: 'qr_test_1',
    code: 'QRR-123456',
    batch: 'BATCH-2026011',
    status: QrStatus.ASSIGNED,
    vehicleId: 'veh_test_1',
    scansCount: 5,
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
    vehicle: {
      id: 'veh_test_1',
      reg: 'KA05MN4321',
      model: 'Mahindra XUV700',
      user: {
        id: 'user_owner_1',
        firstName: 'Vikram',
        lastName: 'Singh',
        email: 'vikram@example.com',
        phone: '+919876500001',
      },
    },
    history: [
      {
        id: 'hist_1',
        qrCodeId: 'qr_test_1',
        qrCodeValue: 'QRR-123456',
        vehicleId: 'veh_test_1',
        vehicleReg: 'KA05MN4321',
        userId: 'user_owner_1',
        userEmail: 'vikram@example.com',
        assignedBy: 'admin_qr_test_1',
        assignedAt: new Date('2026-10-10T10:00:00Z'),
        unassignedAt: null,
        reason: 'INITIAL_ASSIGNMENT',
        notes: 'Initial activation',
        vehicle: {
          id: 'veh_test_1',
          reg: 'KA05MN4321',
          model: 'Mahindra XUV700',
        },
        user: {
          id: 'user_owner_1',
          firstName: 'Vikram',
          lastName: 'Singh',
          email: 'vikram@example.com',
        },
      },
    ],
    scanLogs: [
      {
        id: 'scan_1',
        qrCodeId: 'qr_test_1',
        qrCodeValue: 'QRR-123456',
        scannedAt: new Date('2026-10-11T12:00:00Z'),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Scanner',
        city: 'Indore',
        actionTaken: 'VIEW',
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(superAdminUser as never);
    vi.spyOn(adminQrRepository, 'lockById').mockImplementation(async (id, tx) => {
      const db = (tx ?? prisma) as unknown as { qrCode?: { findUnique?: (args: unknown) => Promise<unknown> } };
      return (db.qrCode?.findUnique ? ((await db.qrCode.findUnique({ where: { id } })) as never) : null);
    });
    vi.spyOn(adminQrRepository, 'lockByCode').mockImplementation(async (code, tx) => {
      const db = (tx ?? prisma) as unknown as { qrCode?: { findUnique?: (args: unknown) => Promise<unknown> } };
      return (db.qrCode?.findUnique ? ((await db.qrCode.findUnique({ where: { code: code.toUpperCase() } })) as never) : null);
    });
    vi.spyOn(adminQrRepository, 'lockVehicleById').mockImplementation(async (vehicleId, tx) => {
      const db = (tx ?? prisma) as unknown as { vehicle?: { findUnique?: (args: unknown) => Promise<unknown> } };
      return (db.vehicle?.findUnique ? ((await db.vehicle.findUnique({ where: { id: vehicleId } })) as never) : null);
    });
    vi.spyOn(adminQrRepository, 'lockActiveByVehicleId').mockImplementation(async (vehicleId, tx) => {
      const db = (tx ?? prisma) as unknown as { qrCode?: { findFirst?: (args: unknown) => Promise<unknown> } };
      return (db.qrCode?.findFirst
        ? ((await db.qrCode.findFirst({
            where: {
              vehicleId,
              status: { in: [QrStatus.ASSIGNED, QrStatus.ACTIVE, QrStatus.SUSPENDED] },
            },
          })) as never)
        : null);
    });
  });

  // =========================================================================
  // 1. Authorization & Boundary Checks
  // =========================================================================
  describe('Authorization & Boundary Checks', () => {
    it('rejects unauthenticated request to /admin/qr with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/qr');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects regular user token on /admin/qr with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'regular_cust_1',
        email: 'regular_cust@fioner.test',
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/qr')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 2. QR Inventory Listing (GET /api/v1/admin/qr)
  // =========================================================================
  describe('QR Inventory Listing (GET /api/v1/admin/qr)', () => {
    it('returns paginated QR inventory with formatted owner and vehicle info', async () => {
      vi.spyOn(adminQrRepository, 'listQrCodes').mockResolvedValueOnce({
        items: [mockDbQr as never],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/qr')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);

      const item = res.body.data[0];
      expect(item.id).toBe('qr_test_1');
      expect(item.code).toBe('QRR-123456');
      expect(item.batch).toBe('BATCH-2026011');
      expect(item.status).toBe('assigned');
      expect(item.vehicleReg).toBe('KA05MN4321');
      expect(item.ownerName).toBe('Vikram Singh');
      expect(item.scans).toBe(5);

      expect(res.body.meta.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('applies status and search filters correctly', async () => {
      const listSpy = vi.spyOn(adminQrRepository, 'listQrCodes').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/qr?status=available&search=BATCH-2026011&page=2&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'AVAILABLE',
          search: 'BATCH-2026011',
          page: 2,
          limit: 10,
        }),
      );
    });
  });

  // =========================================================================
  // 3. QR Detail & Timeline (GET /api/v1/admin/qr/:id)
  // =========================================================================
  describe('QR Detail (GET /api/v1/admin/qr/:id)', () => {
    it('returns complete QR drawer data with owner, vehicle, history and scan logs', async () => {
      vi.spyOn(adminQrRepository, 'findById').mockResolvedValueOnce(mockDbQr as never);

      const res = await request(app)
        .get('/api/v1/admin/qr/qr_test_1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.id).toBe('qr_test_1');
      expect(data.code).toBe('QRR-123456');
      expect(data.status).toBe('assigned');
      expect(data.vehicleReg).toBe('KA05MN4321');
      expect(data.owner.fullName).toBe('Vikram Singh');
      expect(data.history).toHaveLength(1);
      expect(data.history[0].reason).toBe('INITIAL_ASSIGNMENT');
      expect(data.recentScans).toHaveLength(1);
      expect(data.recentScans[0].city).toBe('Indore');
    });

    it('returns 404 NOT_FOUND when QR code does not exist', async () => {
      vi.spyOn(adminQrRepository, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/qr/nonexistent_qr')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 4. Batch Import and Generation (POST /api/v1/admin/qr/batch)
  // =========================================================================
  describe('Batch Generate / Import (POST /api/v1/admin/qr/batch)', () => {
    it('generates a batch of available QR codes and writes audit log', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
        });
      });
      vi.spyOn(adminQrRepository, 'findExistingCodes').mockResolvedValueOnce([]);
      vi.spyOn(adminQrRepository, 'createMany').mockResolvedValueOnce({ count: 5 } as never);
      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/qr/batch')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          batchName: 'BATCH-202610A',
          quantity: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batch).toBe('BATCH-202610A');
      expect(res.body.data.count).toBe(5);
      expect(res.body.data.status).toBe('AVAILABLE');
      expect(auditSpy).toHaveBeenCalled();
    });

    it('rejects batch import with duplicate codes in request payload with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/admin/qr/batch')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          batchName: 'BATCH-DUP',
          codes: ['QRR-111111', 'QRR-222222', 'QRR-111111'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects batch import when code already exists in database with 409 CONFLICT', async () => {
      vi.spyOn(adminQrRepository, 'findExistingCodes').mockResolvedValueOnce(['QRR-999999']);

      const res = await request(app)
        .post('/api/v1/admin/qr/batch')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          batchName: 'BATCH-EXISTING',
          codes: ['QRR-888888', 'QRR-999999'],
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('QRR-999999');
    });
  });

  // =========================================================================
  // 5. QR Assignment to Vehicle (POST /api/v1/admin/qr/:id/assign)
  // =========================================================================
  describe('Assign QR (POST /api/v1/admin/qr/:id/assign)', () => {
    it('successfully assigns available QR to target vehicle and records history', async () => {
      const availableQr = {
        id: 'qr_avail_1',
        code: 'QRR-333333',
        status: QrStatus.AVAILABLE,
        vehicleId: null,
      };

      const targetVehicle = {
        id: 'veh_target_1',
        reg: 'MH12AB1234',
        userId: 'user_target_1',
        user: { firstName: 'Rahul', lastName: 'Sharma' },
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(availableQr),
            findFirst: vi.fn().mockResolvedValue(null), // no active QR on target vehicle
            update: vi.fn().mockResolvedValue({
              ...availableQr,
              vehicleId: targetVehicle.id,
              status: QrStatus.ASSIGNED,
            }),
          },
          vehicle: {
            findUnique: vi.fn().mockResolvedValue(targetVehicle),
          },
        });
      });

      vi.spyOn(adminQrRepository, 'update').mockResolvedValueOnce({
        ...availableQr,
        vehicleId: targetVehicle.id,
        status: QrStatus.ASSIGNED,
      } as never);

      vi.spyOn(adminQrRepository, 'createAssignmentHistory').mockResolvedValueOnce({} as never);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_avail_1/assign')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ vehicleId: 'veh_target_1', notes: 'Assigned by admin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('QRR-333333');
      expect(res.body.data.vehicleReg).toBe('MH12AB1234');
      expect(res.body.data.ownerName).toBe('Rahul Sharma');
    });

    it('rejects assignment when target vehicle already has an active QR code (enforcing single active QR)', async () => {
      const availableQr = {
        id: 'qr_avail_1',
        code: 'QRR-333333',
        status: QrStatus.AVAILABLE,
        vehicleId: null,
      };

      const targetVehicle = {
        id: 'veh_target_1',
        reg: 'MH12AB1234',
        userId: 'user_target_1',
        user: { firstName: 'Rahul', lastName: 'Sharma' },
      };

      const conflictingActiveQr = {
        id: 'qr_active_conflict',
        code: 'QRR-777777',
        status: QrStatus.ACTIVE,
        vehicleId: 'veh_target_1',
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(availableQr),
            findFirst: vi.fn().mockResolvedValue(conflictingActiveQr),
          },
          vehicle: {
            findUnique: vi.fn().mockResolvedValue(targetVehicle),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_avail_1/assign')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ vehicleId: 'veh_target_1' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already has an active QR code');
    });

    it('rejects assignment of permanently retired QR code (REPLACED / DEACTIVATED)', async () => {
      const retiredQr = {
        id: 'qr_retired',
        code: 'QRR-999999',
        status: QrStatus.REPLACED,
        vehicleId: null,
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(retiredQr),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_retired/assign')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ vehicleId: 'veh_target_1' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('retired');
    });
  });

  // =========================================================================
  // 6. QR Replacement (POST /api/v1/admin/qr/:id/replace)
  // =========================================================================
  describe('Replace QR (POST /api/v1/admin/qr/:id/replace)', () => {
    it('replaces active QR: marks old as replaced, binds new QR to vehicle, and preserves history', async () => {
      const oldActiveQr = {
        id: 'qr_old_1',
        code: 'QRR-OLD123',
        batch: 'BATCH-2026011',
        status: QrStatus.ACTIVE,
        vehicleId: 'veh_linked_1',
        vehicle: {
          id: 'veh_linked_1',
          reg: 'DL01XY9999',
          userId: 'user_dl',
          user: { firstName: 'Deepak', lastName: 'Kumar' },
        },
      };

      const newQr = {
        id: 'qr_new_2',
        code: 'QRR-NEW456',
        batch: 'BATCH-2026011',
        status: QrStatus.ASSIGNED,
      };

      const updateSpy = vi.fn().mockResolvedValue({});
      const createSpy = vi.fn().mockResolvedValue(newQr);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockImplementation(({ where }) => {
              if (where.id === 'qr_old_1') return Promise.resolve(oldActiveQr);
              return Promise.resolve(null);
            }),
            create: createSpy,
            update: updateSpy,
          },
        });
      });

      vi.spyOn(adminQrRepository, 'closeActiveAssignmentHistory').mockResolvedValueOnce({} as never);
      vi.spyOn(adminQrRepository, 'createAssignmentHistory').mockResolvedValueOnce({} as never);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_old_1/replace')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Damaged physical tag' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.replacedQr.id).toBe('qr_old_1');
      expect(res.body.data.replacedQr.status).toBe('replaced');
      expect(res.body.data.activeQr.id).toBe('qr_new_2');
      expect(res.body.data.activeQr.vehicleReg).toBe('DL01XY9999');
    });

    it('rejects replacement when QR is not linked to any vehicle', async () => {
      const unlinkedQr = {
        id: 'qr_unlinked',
        code: 'QRR-FREE1',
        status: QrStatus.AVAILABLE,
        vehicleId: null,
        vehicle: null,
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(unlinkedQr),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_unlinked/replace')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Tag replacement' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('not linked to any vehicle');
    });
  });

  // =========================================================================
  // 7. Suspension & Reactivation (POST /suspend & /reactivate)
  // =========================================================================
  describe('Suspension & Reactivation', () => {
    it('suspends active QR and records audit log', async () => {
      const activeQr = {
        id: 'qr_to_suspend',
        code: 'QRR-SUS123',
        status: QrStatus.ACTIVE,
        vehicleId: 'veh_1',
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(activeQr),
            update: vi.fn().mockResolvedValue({
              ...activeQr,
              status: QrStatus.SUSPENDED,
            }),
          },
        });
      });

      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_to_suspend/suspend')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Owner requested temporary freeze' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('suspended');
      expect(auditSpy).toHaveBeenCalled();
    });

    it('reactivates suspended QR to active state and records audit log', async () => {
      const suspendedQr = {
        id: 'qr_suspended_1',
        code: 'QRR-SUS123',
        status: QrStatus.SUSPENDED,
        vehicleId: 'veh_1',
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(suspendedQr),
            update: vi.fn().mockResolvedValue({
              ...suspendedQr,
              status: QrStatus.ACTIVE,
            }),
          },
        });
      });

      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_suspended_1/reactivate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ notes: 'Vehicle back in service' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
      expect(auditSpy).toHaveBeenCalled();
    });

    it('rejects reactivation of non-suspended QR', async () => {
      const activeQr = {
        id: 'qr_active_already',
        code: 'QRR-ACT123',
        status: QrStatus.ACTIVE,
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(activeQr),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_active_already/reactivate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Only SUSPENDED');
    });
  });

  // =========================================================================
  // 8. Deactivation (POST /api/v1/admin/qr/:id/deactivate)
  // =========================================================================
  describe('Deactivation (POST /api/v1/admin/qr/:id/deactivate)', () => {
    it('deactivates QR permanently, unbinds vehicle, closes history, and records audit log', async () => {
      const qrToDeactivate = {
        id: 'qr_deact_1',
        code: 'QRR-DEACT1',
        status: QrStatus.ACTIVE,
        vehicleId: 'veh_deact',
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(qrToDeactivate),
            update: vi.fn().mockResolvedValue({
              ...qrToDeactivate,
              status: QrStatus.DEACTIVATED,
              vehicleId: null,
            }),
          },
        });
      });

      vi.spyOn(adminQrRepository, 'closeActiveAssignmentHistory').mockResolvedValueOnce({} as never);
      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/qr/qr_deact_1/deactivate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Damaged beyond repair' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('deactivated');
      expect(auditSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. Scan & Activity Logs (GET /api/v1/admin/qr/:id/scans)
  // =========================================================================
  describe('Scan Logs (GET /api/v1/admin/qr/:id/scans)', () => {
    it('returns paginated scan logs for the QR code', async () => {
      vi.spyOn(adminQrRepository, 'findById').mockResolvedValueOnce(mockDbQr as never);
      vi.spyOn(adminQrRepository, 'listScanLogs').mockResolvedValueOnce({
        items: [
          {
            id: 'scan_log_1',
            qrCodeId: 'qr_test_1',
            scannedAt: new Date('2026-10-12T14:30:00Z'),
            ipAddress: '203.0.113.195',
            userAgent: 'Mozilla/5.0 Scanner',
            city: 'Indore',
            actionTaken: 'VIEW',
          } as never,
        ],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/qr/qr_test_1/scans')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].city).toBe('Indore');
      expect(res.body.meta.pagination.total).toBe(1);
    });

    it('returns 404 NOT_FOUND when querying scans for nonexistent QR', async () => {
      vi.spyOn(adminQrRepository, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/qr/nonexistent_qr/scans')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 10. Raw Query Locking Helper Verification & Error Propagation
  // =========================================================================
  describe('Raw Query Locking Helpers (adminQrRepository)', () => {
    // Un-spy repository methods to test the real implementation directly
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('lockById: propagates database errors and never silently falls back to findUnique', async () => {
      vi.restoreAllMocks();
      const dbError = new Error('40P01 deadlock detected in postgres');
      const mockTx = {
        $queryRaw: vi.fn().mockRejectedValue(dbError),
        qrCode: { findUnique: vi.fn() },
      } as unknown as Parameters<typeof adminQrRepository.lockById>[1];

      await expect(adminQrRepository.lockById('qr_fail_1', mockTx)).rejects.toThrow(dbError);
      expect(mockTx!.qrCode.findUnique).not.toHaveBeenCalled();
    });

    it('lockByCode: propagates database errors and never silently falls back to findUnique', async () => {
      vi.restoreAllMocks();
      const dbError = new Error('Connection terminated unexpectedly');
      const mockTx = {
        $queryRaw: vi.fn().mockRejectedValue(dbError),
        qrCode: { findUnique: vi.fn() },
      } as unknown as Parameters<typeof adminQrRepository.lockByCode>[1];

      await expect(adminQrRepository.lockByCode('QRR-FAIL', mockTx)).rejects.toThrow(dbError);
      expect(mockTx!.qrCode.findUnique).not.toHaveBeenCalled();
    });

    it('lockVehicleById: propagates database errors and never silently falls back to findUnique', async () => {
      vi.restoreAllMocks();
      const dbError = new Error('Statement timeout');
      const mockTx = {
        $queryRaw: vi.fn().mockRejectedValue(dbError),
        vehicle: { findUnique: vi.fn() },
      } as unknown as Parameters<typeof adminQrRepository.lockVehicleById>[1];

      await expect(adminQrRepository.lockVehicleById('veh_fail_1', mockTx)).rejects.toThrow(dbError);
      expect(mockTx!.vehicle.findUnique).not.toHaveBeenCalled();
    });

    it('lockActiveByVehicleId: propagates database errors and never silently falls back to findFirst', async () => {
      vi.restoreAllMocks();
      const dbError = new Error('Query cancelled by user');
      const mockTx = {
        $queryRaw: vi.fn().mockRejectedValue(dbError),
        qrCode: { findFirst: vi.fn() },
      } as unknown as Parameters<typeof adminQrRepository.lockActiveByVehicleId>[1];

      await expect(adminQrRepository.lockActiveByVehicleId('veh_fail_1', mockTx)).rejects.toThrow(dbError);
      expect(mockTx!.qrCode.findFirst).not.toHaveBeenCalled();
    });

    it('lockById: returns row when query succeeds, returns null without findUnique when 0 rows', async () => {
      vi.restoreAllMocks();
      const foundRow = { id: 'qr_1', code: 'QRR-1', batch: 'B1', status: QrStatus.AVAILABLE, vehicleId: null };
      const mockTx = {
        $queryRaw: vi.fn()
          .mockResolvedValueOnce([foundRow])
          .mockResolvedValueOnce([]),
        qrCode: { findUnique: vi.fn() },
      } as unknown as Parameters<typeof adminQrRepository.lockById>[1];

      const res1 = await adminQrRepository.lockById('qr_1', mockTx);
      expect(res1).toEqual(foundRow);
      expect(mockTx!.qrCode.findUnique).not.toHaveBeenCalled();

      const res2 = await adminQrRepository.lockById('qr_nonexistent', mockTx);
      expect(res2).toBeNull();
      expect(mockTx!.qrCode.findUnique).not.toHaveBeenCalled();
    });

    it('throws in production if database client lacks raw query locking support', async () => {
      vi.restoreAllMocks();
      process.env.NODE_ENV = 'production';
      const mockClientNoRaw = {
        qrCode: { findUnique: vi.fn() },
      } as unknown as Parameters<typeof adminQrRepository.lockById>[1];

      await expect(adminQrRepository.lockById('qr_1', mockClientNoRaw)).rejects.toThrow(
        /Database client does not support raw query locking/i,
      );
      expect(mockClientNoRaw!.qrCode.findUnique).not.toHaveBeenCalled();
    });
  });
});
