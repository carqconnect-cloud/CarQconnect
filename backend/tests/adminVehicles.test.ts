import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminVehicleRepository } from '../src/modules/admin/vehicles/adminVehicle.repository';
import { FuelType, VehicleDocumentType } from '@prisma/client';
import { computeReminderStatus } from '../src/modules/vehicles/vehicle.service';

describe('Super Admin Vehicle Administration Endpoints (/api/v1/admin/vehicles/*)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'admin_veh_test_1',
    email: 'superadmin_veh@fioner.test',
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

  const mockDbVehicle = {
    id: 'veh_admin_123',
    userId: 'user_owner_1',
    reg: 'KA05MN4321',
    model: 'Mahindra XUV700',
    fuel: FuelType.DIESEL,
    mileage: 14.5,
    docExpiry: new Date(Date.now() + 45 * 86400000), // 45 days in future
    isDefault: true,
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
    user: {
      id: 'user_owner_1',
      firstName: 'Vikram',
      lastName: 'Singh',
      email: 'vikram@example.com',
      phone: '+919876500001',
    },
    documents: [
      {
        id: 'doc_1',
        vehicleId: 'veh_admin_123',
        type: VehicleDocumentType.INSURANCE,
        documentNumber: 'POL-123456',
        expiryDate: new Date(Date.now() + 45 * 86400000),
        notes: null,
        createdAt: new Date('2026-10-10T10:00:00Z'),
        updatedAt: new Date('2026-10-10T10:00:00Z'),
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(superAdminUser as never);
  });

  describe('Authorization & Security Boundary', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/vehicles');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects regular non-superadmin user with 403 FORBIDDEN_SUPER_ADMIN_REQUIRED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'regular_cust_1',
        email: 'regular_cust@fioner.test',
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/vehicles')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows Super Admin global access without tenant headers', async () => {
      vi.spyOn(adminVehicleRepository, 'listVehicles').mockResolvedValueOnce({
        items: [mockDbVehicle] as never,
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/vehicles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Vehicle Directory (GET /api/v1/admin/vehicles)', () => {
    it('returns paginated vehicle list with fields matching adminApp.ts table columns', async () => {
      vi.spyOn(adminVehicleRepository, 'listVehicles').mockResolvedValueOnce({
        items: [mockDbVehicle] as never,
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/vehicles?page=1&limit=20')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);

      const row = res.body.data[0];
      expect(row.id).toBe(mockDbVehicle.id);
      expect(row.reg).toBe('KA05MN4321');
      expect(row.model).toBe('Mahindra XUV700');
      expect(row.fuel).toBe('Diesel');
      expect(row.fuelType).toBe('DIESEL');
      expect(row.ownerName).toBe('Vikram Singh');
      expect(row.ownerEmail).toBe('vikram@example.com');
      expect(row.qrLinked).toBe(false);
      expect(row.gpsLinked).toBe(false);
      expect(row.addedAt).toBeDefined();

      expect(res.body.meta.pagination.total).toBe(1);
      expect(res.body.meta.pagination.page).toBe(1);
      expect(res.body.meta.pagination.limit).toBe(20);
      expect(res.body.meta.pagination.totalPages).toBe(1);
    });

    it('passes search query and fuel filter to repository', async () => {
      const listSpy = vi.spyOn(adminVehicleRepository, 'listVehicles').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/vehicles?search=KA05&fuel=DIESEL&sortBy=reg&sortOrder=asc')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'KA05',
          fuel: FuelType.DIESEL,
          sortBy: 'reg',
          sortOrder: 'asc',
        }),
      );
    });

    it('rejects invalid fuel filter with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/vehicles?fuel=WATER')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Vehicle Detail & Drawer (GET /api/v1/admin/vehicles/:id)', () => {
    it('returns complete vehicle drawer data with owner, documents, links and activity', async () => {
      vi.spyOn(adminVehicleRepository, 'findById').mockResolvedValueOnce(mockDbVehicle as never);
      vi.spyOn(adminVehicleRepository, 'findAuditActivity').mockResolvedValueOnce([
        {
          id: 'aud_1',
          action: 'vehicle.created',
          entity: 'Vehicle',
          entityId: mockDbVehicle.id,
          createdAt: new Date('2026-10-10T10:00:00Z'),
          actorId: 'user_owner_1',
          actor: {
            id: 'user_owner_1',
            firstName: 'Vikram',
            lastName: 'Singh',
            email: 'vikram@example.com',
          },
        },
      ] as never);

      const res = await request(app)
        .get(`/api/v1/admin/vehicles/${mockDbVehicle.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.id).toBe(mockDbVehicle.id);
      expect(data.reg).toBe('KA05MN4321');
      expect(data.model).toBe('Mahindra XUV700');
      expect(data.fuel).toBe('Diesel');
      expect(data.owner.fullName).toBe('Vikram Singh');
      expect(data.owner.email).toBe('vikram@example.com');

      // Documents & reminders tab
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].type).toBe('INSURANCE');
      expect(data.documents[0].reminderStatus).toBe('UP_TO_DATE');

      // QR & GPS links tab (truthful representation)
      expect(data.links.qr.linked).toBe(false);
      expect(data.links.qr.code).toBeNull();
      expect(data.links.qr.domainStatus).toBe('NOT_YET_BUILT');
      expect(data.links.gps.linked).toBe(false);
      expect(data.links.gps.imei).toBeNull();
      expect(data.links.gps.domainStatus).toBe('NOT_YET_BUILT');

      // Activity tab
      expect(data.activity).toHaveLength(1);
      expect(data.activity[0].action).toBe('vehicle.created');
      expect(data.activity[0].label).toBe('Vehicle added to garage');
    });

    it('returns 404 NOT_FOUND when vehicle does not exist', async () => {
      vi.spyOn(adminVehicleRepository, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/vehicles/nonexistent_id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Document Expiry Exact Boundary Calculations', () => {
    it('correctly calculates EXPIRED for dates in the past', () => {
      const past = new Date(Date.now() - 1000);
      const res = computeReminderStatus(past);
      expect(res.status).toBe('EXPIRED');
      expect(res.label).toBe('Expired');
    });

    it('correctly calculates EXPIRING_SOON for dates exactly 30 days away', () => {
      // exactly 30 days in the future
      const exactly30Days = new Date(Date.now() + 30 * 86400000);
      const res = computeReminderStatus(exactly30Days);
      expect(res.status).toBe('EXPIRING_SOON');
      expect(res.label).toBe('Expiring soon');
    });

    it('correctly calculates UP_TO_DATE for dates beyond 30 days away', () => {
      // 31 days in future
      const day31 = new Date(Date.now() + 31 * 86400000);
      const res = computeReminderStatus(day31);
      expect(res.status).toBe('UP_TO_DATE');
      expect(res.label).toBe('Up to date');
    });

    it('correctly returns NO_REMINDER when no date is provided', () => {
      const res = computeReminderStatus(null);
      expect(res.status).toBe('NO_REMINDER');
      expect(res.label).toBe('Up to date');
      expect(res.daysRemaining).toBeNull();
    });
  });
});
