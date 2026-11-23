import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { auditService } from '../src/modules/audit';
import { vehicleRepository } from '../src/modules/vehicles/vehicle.repository';
import { FuelType, GpsDeviceStatus, QrStatus, VehicleDocumentType } from '@prisma/client';
import { computeReminderStatus } from '../src/modules/vehicles/vehicle.service';
import { adminGpsRepository } from '../src/modules/admin/gps/adminGps.repository';
import { adminQrRepository } from '../src/modules/admin/qr/adminQr.repository';

describe('Customer Digital Garage Endpoints (/api/v1/vehicles/*)', () => {
  const app = createApp();

  const user = {
    id: 'user_cust_veh_1',
    email: 'customer_veh@fioner.test',
    isSuperAdmin: false,
    isActive: true,
  };

  const userToken = signAccessToken({
    sub: user.id,
    email: user.email,
    isSuperAdmin: false,
  });

  const mockVehicle = {
    id: 'veh_test_123',
    userId: user.id,
    reg: 'KA01AB1234',
    model: 'Maruti Suzuki Swift',
    fuel: FuelType.PETROL,
    mileage: 18.5,
    docExpiry: new Date(Date.now() + 60 * 86400000), // 60 days in future
    isDefault: true,
    createdAt: new Date('2026-10-12T10:00:00Z'),
    updatedAt: new Date('2026-10-12T10:00:00Z'),
    documents: [
      {
        id: 'doc_1',
        vehicleId: 'veh_test_123',
        type: VehicleDocumentType.RC,
        documentNumber: 'RC-123456',
        expiryDate: new Date(Date.now() + 365 * 86400000),
        notes: null,
        createdAt: new Date('2026-10-12T10:00:00Z'),
        updatedAt: new Date('2026-10-12T10:00:00Z'),
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as never);
    vi.spyOn(auditService, 'record').mockResolvedValue({ id: 'audit_log_veh_1' } as never);
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
    vi.spyOn(adminGpsRepository, 'lockByVehicleId').mockImplementation(async (vehicleId, tx) => {
      const db = (tx ?? prisma) as unknown as { gPSDevice?: { findFirst?: (args: unknown) => Promise<unknown> } };
      return (db.gPSDevice?.findFirst
        ? ((await db.gPSDevice.findFirst({
            where: { vehicleId },
          })) as never)
        : null);
    });
    vi.spyOn(adminGpsRepository, 'lockVehicleById').mockImplementation(async (vehicleId, tx) => {
      const db = (tx ?? prisma) as unknown as { vehicle?: { findUnique?: (args: unknown) => Promise<unknown> } };
      return (db.vehicle?.findUnique ? ((await db.vehicle.findUnique({ where: { id: vehicleId } })) as never) : null);
    });
  });

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/vehicles');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects invalid bearer token with 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .get('/api/v1/vehicles')
        .set('Authorization', 'Bearer invalid_malformed_token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Create Vehicle (POST /api/v1/vehicles)', () => {
    it('creates vehicle with uppercase registration normalization, computes reminder and logs audit', async () => {
      const clearDefaultSpy = vi.spyOn(vehicleRepository, 'clearDefault').mockResolvedValue({ count: 1 } as never);
      const createSpy = vi.spyOn(vehicleRepository, 'create').mockResolvedValue(mockVehicle as never);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reg: 'ka01ab1234', // Lowercase: should normalize to KA01AB1234
          model: 'Maruti Suzuki Swift',
          fuel: 'Petrol',
          mileage: 18.5,
          isDefault: true,
          documents: [
            {
              type: 'RC',
              documentNumber: 'RC-123456',
              expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockVehicle.id);
      expect(res.body.data.reminderStatus).toBe('UP_TO_DATE');
      expect(clearDefaultSpy).toHaveBeenCalledWith(user.id, expect.anything());
      expect(createSpy).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          reg: 'KA01AB1234',
          model: 'Maruti Suzuki Swift',
          fuel: FuelType.PETROL,
        }),
        expect.anything(),
      );
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'vehicle.created',
          entity: 'Vehicle',
          entityId: mockVehicle.id,
        }),
        expect.anything(),
      );
    });

    it('calculates EXPIRING_SOON when document expiry is within 30 days', async () => {
      const expiringSoonVehicle = {
        ...mockVehicle,
        docExpiry: new Date(Date.now() + 15 * 86400000), // 15 days in future
      };
      vi.spyOn(vehicleRepository, 'create').mockResolvedValue(expiringSoonVehicle as never);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reg: 'KA02CD5678',
          model: 'Hyundai Creta',
          fuel: 'DIESEL',
          docExpiry: new Date(Date.now() + 15 * 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reminderStatus).toBe('EXPIRING_SOON');
      expect(res.body.data.reminderLabel).toBe('Expiring soon');
    });

    it('calculates EXPIRED when document expiry is in the past', async () => {
      const expiredVehicle = {
        ...mockVehicle,
        docExpiry: new Date(Date.now() - 5 * 86400000), // 5 days in past
      };
      vi.spyOn(vehicleRepository, 'create').mockResolvedValue(expiredVehicle as never);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reg: 'KA03EF9012',
          model: 'Tata Nexon',
          fuel: 'ELECTRIC',
          docExpiry: new Date(Date.now() - 5 * 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reminderStatus).toBe('EXPIRED');
      expect(res.body.data.reminderLabel).toBe('Expired');
    });

    it('returns 409 Conflict when user already has this registration number', async () => {
      const p2002Err = new Error('Unique constraint failed on the fields: (`userId`,`reg`)');
      (p2002Err as unknown as { code: string }).code = 'P2002';
      vi.spyOn(vehicleRepository, 'create').mockRejectedValue(p2002Err);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reg: 'KA01AB1234',
          model: 'Duplicate Car',
          fuel: 'PETROL',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already exists in your garage');
    });

    it('rejects invalid fuel type with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reg: 'KA01AB1234',
          model: 'Honda City',
          fuel: 'KEROSENE', // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects negative mileage with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reg: 'KA01AB1234',
          model: 'Honda City',
          fuel: 'PETROL',
          mileage: -15, // Invalid: must be positive
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('List Vehicles (GET /api/v1/vehicles)', () => {
    it('returns customer vehicles with reminder status', async () => {
      vi.spyOn(vehicleRepository, 'listByUser').mockResolvedValue([mockVehicle] as never);

      const res = await request(app)
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockVehicle.id);
      expect(res.body.data[0].reg).toBe('KA01AB1234');
      expect(res.body.data[0].reminderStatus).toBe('UP_TO_DATE');
    });
  });

  describe('Get Vehicle By ID (GET /api/v1/vehicles/:id)', () => {
    it('returns vehicle detail when vehicle belongs to authenticated user', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);

      const res = await request(app)
        .get(`/api/v1/vehicles/${mockVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockVehicle.id);
    });

    it('returns 404 NOT_FOUND when vehicle belongs to another user or does not exist', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/vehicles/other_users_vehicle_id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Update Vehicle (PATCH /api/v1/vehicles/:id)', () => {
    it('updates vehicle attributes and writes audit log', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      const updateSpy = vi.spyOn(vehicleRepository, 'update').mockResolvedValue({
        ...mockVehicle,
        model: 'Swift Facelift 2026',
        mileage: 19.2,
      } as never);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .patch(`/api/v1/vehicles/${mockVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          model: 'Swift Facelift 2026',
          mileage: 19.2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.model).toBe('Swift Facelift 2026');
      expect(updateSpy).toHaveBeenCalledWith(
        mockVehicle.id,
        user.id,
        expect.objectContaining({ model: 'Swift Facelift 2026', mileage: 19.2 }),
        expect.anything(),
      );
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'vehicle.updated',
          entity: 'Vehicle',
          entityId: mockVehicle.id,
        }),
        expect.anything(),
      );
    });

    it('normalizes updated registration number to uppercase trimmed', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      const updateSpy = vi.spyOn(vehicleRepository, 'update').mockResolvedValue({
        ...mockVehicle,
        reg: 'MH12CD5678',
      } as never);

      const res = await request(app)
        .patch(`/api/v1/vehicles/${mockVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reg: '  mh12cd5678  ' });

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        mockVehicle.id,
        user.id,
        expect.objectContaining({ reg: 'MH12CD5678' }),
        expect.anything(),
      );
    });

    it('returns 409 CONFLICT if updated registration matches another vehicle owned by same user', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as unknown as { code: string }).code = 'P2002';
      vi.spyOn(vehicleRepository, 'update').mockRejectedValue(p2002Error);

      const res = await request(app)
        .patch(`/api/v1/vehicles/${mockVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reg: 'KA02XY9999' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 404 when attempting to update another user vehicle', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/v1/vehicles/unauthorized_veh_id')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ model: 'New Model' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Delete Vehicle (DELETE /api/v1/vehicles/:id)', () => {
    it('deletes owned vehicle, writes audit log, and returns 204 No Content', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      const deleteSpy = vi.spyOn(vehicleRepository, 'delete').mockResolvedValue(mockVehicle as never);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .delete(`/api/v1/vehicles/${mockVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(204);
      expect(deleteSpy).toHaveBeenCalledWith(mockVehicle.id, expect.anything());
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'vehicle.deleted',
          entity: 'Vehicle',
          entityId: mockVehicle.id,
        }),
        expect.anything(),
      );
    });

    it('returns 404 when attempting to delete another user vehicle', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/vehicles/unauthorized_veh_id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('deletes vehicle with bound GPS device, cleans up binding, closes history, and logs audit', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      const deleteSpy = vi.spyOn(vehicleRepository, 'delete').mockResolvedValue(mockVehicle as never);
      const auditSpy = vi.spyOn(auditService, 'record');

      const mockGps = {
        id: 'gps_bound_test_1',
        imei: '861234567890123',
        status: GpsDeviceStatus.ACTIVE,
        vehicleId: mockVehicle.id,
      };

      vi.spyOn(adminGpsRepository, 'lockByVehicleId').mockResolvedValue(mockGps as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValue(mockVehicle as never);
      const closeHistorySpy = vi.spyOn(adminGpsRepository, 'closeActiveAssignmentHistory').mockResolvedValue({ count: 1 });
      const updateGpsSpy = vi.spyOn(adminGpsRepository, 'update').mockResolvedValue({ ...mockGps, status: GpsDeviceStatus.UNASSIGNED, vehicleId: null } as never);

      const res = await request(app)
        .delete(`/api/v1/vehicles/${mockVehicle.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(204);
      expect(closeHistorySpy).toHaveBeenCalledWith(
        mockGps.id,
        'VEHICLE_DELETED',
        expect.anything(),
        'Vehicle deleted from garage',
      );
      expect(updateGpsSpy).toHaveBeenCalledWith(
        mockGps.id,
        {
          vehicleId: null,
          status: GpsDeviceStatus.UNASSIGNED,
        },
        expect.anything(),
      );
      expect(deleteSpy).toHaveBeenCalledWith(mockVehicle.id, expect.anything());
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.gps_unbound',
          entity: 'GPSDevice',
          entityId: mockGps.id,
          metadata: expect.objectContaining({
            reason: 'VEHICLE_DELETED',
            unboundVehicleId: mockVehicle.id,
          }),
        }),
        expect.anything(),
      );
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'vehicle.deleted',
          entity: 'Vehicle',
          entityId: mockVehicle.id,
        }),
        expect.anything(),
      );
    });
  });

  describe('Document Expiry Derivation & Reminder Computation', () => {
    it('returns NO_REMINDER when document expiry is missing or null', () => {
      const res = computeReminderStatus(null);
      expect(res.status).toBe('NO_REMINDER');
      expect(res.label).toBe('Up to date');
      expect(res.daysRemaining).toBeNull();
    });

    it('returns EXPIRED when document expiry is in the past', () => {
      const pastDate = new Date(Date.now() - 5 * 86400000);
      const res = computeReminderStatus(pastDate);
      expect(res.status).toBe('EXPIRED');
      expect(res.label).toBe('Expired');
      expect(res.daysRemaining).toBeLessThan(0);
    });

    it('returns EXPIRING_SOON when document expiry is within 30 days', () => {
      const soonDate = new Date(Date.now() + 10 * 86400000);
      const res = computeReminderStatus(soonDate);
      expect(res.status).toBe('EXPIRING_SOON');
      expect(res.label).toBe('Expiring soon');
      expect(res.daysRemaining).toBe(10);
    });

    it('returns UP_TO_DATE when document expiry is beyond 30 days', () => {
      const futureDate = new Date(Date.now() + 60 * 86400000);
      const res = computeReminderStatus(futureDate);
      expect(res.status).toBe('UP_TO_DATE');
      expect(res.label).toBe('Up to date');
      expect(res.daysRemaining).toBe(60);
    });

    it('correctly handles the 30-day boundary: exactly 30 days is EXPIRING_SOON, 31 days is UP_TO_DATE', () => {
      const exactly30Days = new Date(Date.now() + 30 * 86400000);
      const res30 = computeReminderStatus(exactly30Days);
      expect(res30.status).toBe('EXPIRING_SOON');

      const exactly31Days = new Date(Date.now() + 31 * 86400000);
      const res31 = computeReminderStatus(exactly31Days);
      expect(res31.status).toBe('UP_TO_DATE');
    });

    it('derives docExpiry from the earliest document when multiple documents are provided on creation', async () => {
      const createSpy = vi.spyOn(vehicleRepository, 'create').mockResolvedValue(mockVehicle as never);

      const earlyExpiry = new Date(Date.now() + 15 * 86400000).toISOString();
      const lateExpiry = new Date(Date.now() + 90 * 86400000).toISOString();

      await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reg: 'KA01CD5555',
          model: 'Honda Elevate',
          fuel: 'PETROL',
          documents: [
            { type: 'RC', expiryDate: lateExpiry },
            { type: 'INSURANCE', expiryDate: earlyExpiry },
          ],
        });

      expect(createSpy).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          docExpiry: earlyExpiry,
        }),
        expect.anything(),
      );
    });
  });

  describe('Customer QR Code Association (POST & DELETE /api/v1/vehicles/:id/qr)', () => {
    it('successfully activates and links an available QR to caller vehicle', async () => {
      const mockAvailQr = {
        id: 'qr_avail_cust',
        code: 'QRR-778899',
        status: 'AVAILABLE',
        vehicleId: null,
      };

      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      const histCreateSpy = vi.fn().mockResolvedValue({});
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          user: {
            findUnique: vi.fn().mockResolvedValue({ email: 'test@fioner.test' }),
          },
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(mockAvailQr),
            findFirst: vi.fn().mockResolvedValue(null),
            update: vi.fn().mockResolvedValue({
              ...mockAvailQr,
              vehicleId: mockVehicle.id,
              status: 'ACTIVE',
            }),
          },
          qrAssignmentHistory: {
            create: histCreateSpy,
          },
        });
      });
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .post(`/api/v1/vehicles/${mockVehicle.id}/qr`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'QRR-778899' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.linked).toBe(true);
      expect(res.body.data.code).toBe('QRR-778899');
    });

    it('rejects linking when vehicle already has an active QR code', async () => {
      const mockAvailQr = {
        id: 'qr_avail_cust2',
        code: 'QRR-223344',
        status: 'AVAILABLE',
        vehicleId: null,
      };

      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findUnique: vi.fn().mockResolvedValue(mockAvailQr),
            findFirst: vi.fn().mockResolvedValue({ id: 'qr_existing', code: 'QRR-111111' }),
          },
        });
      });

      const res = await request(app)
        .post(`/api/v1/vehicles/${mockVehicle.id}/qr`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'QRR-223344' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('successfully unlinks active QR from vehicle', async () => {
      vi.spyOn(vehicleRepository, 'findByIdAndUser').mockResolvedValue(mockVehicle as never);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          ...prisma,
          qrCode: {
            findFirst: vi.fn().mockResolvedValue({ id: 'qr_linked_1', code: 'QRR-998877' }),
            update: vi.fn().mockResolvedValue({}),
          },
          qrAssignmentHistory: {
            updateMany: vi.fn().mockResolvedValue({}),
          },
        });
      });
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

      const res = await request(app)
        .delete(`/api/v1/vehicles/${mockVehicle.id}/qr`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.linked).toBe(false);
    });
  });
});
