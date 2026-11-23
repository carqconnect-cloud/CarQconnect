import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminGpsRepository } from '../src/modules/admin/gps/adminGps.repository';
import { GpsDeviceStatus } from '@prisma/client';

describe('Super Admin GPS Device Management Endpoints (/api/v1/admin/gps/*)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'admin_gps_test_1',
    email: 'superadmin_gps@fioner.test',
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
    id: 'veh_gps_test_1',
    reg: 'MH12AB1234',
    model: 'Tata Nexon EV',
    fuel: 'ELECTRIC',
    userId: 'user_gps_owner_1',
    user: {
      id: 'user_gps_owner_1',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul@example.com',
      phone: '+919876543210',
    },
    geofences: [
      {
        id: 'gf_test_1',
        vehicleId: 'veh_gps_test_1',
        name: 'Home Zone',
        latitude: 18.5204,
        longitude: 73.8567,
        radiusMeters: 500,
        isActive: true,
        createdAt: new Date('2026-10-10T10:00:00Z'),
        updatedAt: new Date('2026-10-10T10:00:00Z'),
      },
    ],
  };

  const mockDbGpsDevice = {
    id: 'gps_test_1',
    imei: '861234567890123',
    serialNumber: 'SN-GPS-001',
    model: 'Rakshak T1',
    vendor: 'Teltonika',
    status: GpsDeviceStatus.ACTIVE,
    vehicleId: 'veh_gps_test_1',
    batteryLevel: 85,
    signalStrength: 'Strong',
    lastSeenAt: new Date('2026-10-14T10:00:00Z'),
    lastLatitude: 18.5204,
    lastLongitude: 73.8567,
    speed: 35.5,
    heading: 180.0,
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-14T10:00:00Z'),
    vehicle: mockDbVehicle,
    history: [
      {
        id: 'hist_gps_1',
        deviceId: 'gps_test_1',
        deviceImei: '861234567890123',
        vehicleId: 'veh_gps_test_1',
        vehicleReg: 'MH12AB1234',
        userId: 'user_gps_owner_1',
        userEmail: 'rahul@example.com',
        assignedBy: 'admin_gps_test_1',
        assignedAt: new Date('2026-10-10T10:00:00Z'),
        unassignedAt: null,
        reason: 'INITIAL_ASSIGNMENT',
        notes: 'Factory installation',
        vehicle: {
          id: 'veh_gps_test_1',
          reg: 'MH12AB1234',
          model: 'Tata Nexon EV',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(superAdminUser as never);
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);

    vi.spyOn(adminGpsRepository, 'lockById').mockImplementation(async (id, tx) => {
      const db = (tx ?? prisma) as unknown as { gPSDevice?: { findUnique?: (args: unknown) => Promise<unknown> } };
      return (db.gPSDevice?.findUnique ? ((await db.gPSDevice.findUnique({ where: { id } })) as never) : null);
    });

    vi.spyOn(adminGpsRepository, 'lockVehicleById').mockImplementation(async (id, tx) => {
      const db = (tx ?? prisma) as unknown as { vehicle?: { findUnique?: (args: unknown) => Promise<unknown> } };
      return (db.vehicle?.findUnique ? ((await db.vehicle.findUnique({ where: { id } })) as never) : null);
    });

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return cb as never;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authorization & Security Boundary', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/gps');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-Super Admin requests with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'regular_cust_1',
        email: 'regular_cust@fioner.test',
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/gps')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Device Registration (POST /api/v1/admin/gps)', () => {
    it('successfully registers a device with required IMEI and optional serial', async () => {
      vi.spyOn(adminGpsRepository, 'findByImei').mockResolvedValueOnce(null);
      vi.spyOn(adminGpsRepository, 'findBySerialNumber').mockResolvedValueOnce(null);
      vi.spyOn(adminGpsRepository, 'create').mockResolvedValueOnce({
        id: 'gps_new_1',
        imei: '869999888877771',
        serialNumber: 'SN-999',
        model: 'Tracker Pro',
        vendor: 'Coban',
        status: GpsDeviceStatus.UNASSIGNED,
        vehicleId: null,
        batteryLevel: null,
        signalStrength: null,
        lastSeenAt: null,
        lastLatitude: null,
        lastLongitude: null,
        speed: null,
        heading: null,
        createdAt: new Date('2026-10-14T12:00:00Z'),
        updatedAt: new Date('2026-10-14T12:00:00Z'),
      });

      const res = await request(app)
        .post('/api/v1/admin/gps')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          imei: '  869999888877771  ',
          serialNumber: '  SN-999  ',
          model: 'Tracker Pro',
          vendor: 'Coban',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imei).toBe('869999888877771');
      expect(res.body.data.status).toBe('unassigned');
    });

    it('rejects registration when IMEI is missing', async () => {
      const res = await request(app)
        .post('/api/v1/admin/gps')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          model: 'Tracker Pro',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with duplicate IMEI with 409 CONFLICT', async () => {
      vi.spyOn(adminGpsRepository, 'findByImei').mockResolvedValueOnce(mockDbGpsDevice as never);

      const res = await request(app)
        .post('/api/v1/admin/gps')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          imei: '861234567890123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already exists');
    });

    it('rejects registration with duplicate serial number with 409 CONFLICT', async () => {
      vi.spyOn(adminGpsRepository, 'findByImei').mockResolvedValueOnce(null);
      vi.spyOn(adminGpsRepository, 'findBySerialNumber').mockResolvedValueOnce(mockDbGpsDevice as never);

      const res = await request(app)
        .post('/api/v1/admin/gps')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          imei: '869999888877772',
          serialNumber: 'SN-GPS-001',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('serial number');
    });
  });

  describe('Inventory Listing & Inspection (GET /api/v1/admin/gps & GET /:id)', () => {
    it('returns paginated device list matching frontend contract', async () => {
      vi.spyOn(adminGpsRepository, 'listGpsDevices').mockResolvedValueOnce({
        items: [
          {
            ...mockDbGpsDevice,
            vehicle: {
              ...mockDbVehicle,
              _count: { geofences: 1 },
            },
          } as never,
        ],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/gps?page=1&limit=20&status=active')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      const item = res.body.data[0];
      expect(item.imei).toBe('861234567890123');
      expect(item.status).toBe('active');
      expect(item.vehicleReg).toBe('MH12AB1234');
      expect(item.battery).toBe(85);
      expect(item.signal).toBe('Strong');
      expect(item.geofences).toBe(1);
      expect(res.body.meta.pagination.total).toBe(1);
    });

    it('returns complete device detail drawer data with honest telemetry', async () => {
      vi.spyOn(adminGpsRepository, 'findById').mockResolvedValueOnce(mockDbGpsDevice as never);

      const res = await request(app)
        .get(`/api/v1/admin/gps/${mockDbGpsDevice.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.id).toBe(mockDbGpsDevice.id);
      expect(data.imei).toBe(mockDbGpsDevice.imei);
      expect(data.status).toBe('active');
      expect(data.vehicle.reg).toBe('MH12AB1234');
      expect(data.vehicle.owner.email).toBe('rahul@example.com');
      expect(data.history).toHaveLength(1);
      expect(data.geofences).toHaveLength(1);
      expect(data.geofences[0].name).toBe('Home Zone');
    });

    it('returns 404 NOT_FOUND when device does not exist', async () => {
      vi.spyOn(adminGpsRepository, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/gps/nonexistent_gps')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Device Assignment & Cardinality (POST /api/v1/admin/gps/:id/assign)', () => {
    it('successfully assigns an unassigned device to an available vehicle', async () => {
      const unassignedDevice = {
        ...mockDbGpsDevice,
        status: GpsDeviceStatus.UNASSIGNED,
        vehicleId: null,
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(unassignedDevice as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValueOnce(mockDbVehicle as never);
      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValueOnce(mockDbVehicle as never);
      vi.spyOn(prisma.gPSDevice, 'findFirst').mockResolvedValueOnce(null);
      vi.spyOn(adminGpsRepository, 'update').mockResolvedValueOnce({
        ...unassignedDevice,
        vehicleId: mockDbVehicle.id,
        status: GpsDeviceStatus.ACTIVE,
      } as never);
      vi.spyOn(adminGpsRepository, 'createAssignmentHistory').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${unassignedDevice.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vehicleId: mockDbVehicle.id,
          notes: 'Standard assignment',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.vehicleId).toBe(mockDbVehicle.id);
    });

    it('rejects assignment from MAINTENANCE status with 400 Bad Request', async () => {
      const maintenanceDevice = {
        ...mockDbGpsDevice,
        status: GpsDeviceStatus.MAINTENANCE,
        vehicleId: null,
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(maintenanceDevice as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${maintenanceDevice.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vehicleId: mockDbVehicle.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('maintenance');
    });

    it('rejects assignment from DEACTIVATED status with 400 Bad Request', async () => {
      const deactivatedDevice = {
        ...mockDbGpsDevice,
        status: GpsDeviceStatus.DEACTIVATED,
        vehicleId: null,
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(deactivatedDevice as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${deactivatedDevice.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vehicleId: mockDbVehicle.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('deactivated');
    });

    it('rejects assignment if vehicle already has an active GPS device (1:1 constraint)', async () => {
      const unassignedDevice = {
        ...mockDbGpsDevice,
        id: 'gps_unassigned_2',
        status: GpsDeviceStatus.UNASSIGNED,
        vehicleId: null,
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(unassignedDevice as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValueOnce(mockDbVehicle as never);
      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValueOnce(mockDbVehicle as never);
      // Vehicle already bound to another active GPS device
      vi.spyOn(prisma.gPSDevice, 'findFirst').mockResolvedValueOnce(mockDbGpsDevice as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${unassignedDevice.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vehicleId: mockDbVehicle.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already has an active GPS device');
    });

    it('reassigns an active device to another vehicle, closing old history and creating new history', async () => {
      const activeDevice = {
        ...mockDbGpsDevice,
        vehicleId: 'veh_prior_1',
      };

      const newVehicle = {
        ...mockDbVehicle,
        id: 'veh_new_2',
        reg: 'KA01CD5678',
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(activeDevice as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValue(newVehicle as never);
      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValueOnce(newVehicle as never);
      vi.spyOn(prisma.gPSDevice, 'findFirst').mockResolvedValueOnce(null);
      const closeSpy = vi.spyOn(adminGpsRepository, 'closeActiveAssignmentHistory').mockResolvedValueOnce({ count: 1 } as never);
      vi.spyOn(adminGpsRepository, 'update').mockResolvedValueOnce({
        ...activeDevice,
        vehicleId: newVehicle.id,
        status: GpsDeviceStatus.ACTIVE,
      } as never);
      const createHistSpy = vi.spyOn(adminGpsRepository, 'createAssignmentHistory').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${activeDevice.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          vehicleId: newVehicle.id,
          notes: 'Transferred to fleet vehicle 2',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(closeSpy).toHaveBeenCalledWith(activeDevice.id, 'REASSIGNMENT', expect.anything(), 'Transferred to fleet vehicle 2');
      expect(createHistSpy).toHaveBeenCalled();
    });
  });

  describe('Device Unbinding (POST /api/v1/admin/gps/:id/unbind)', () => {
    it('successfully unbinds a bound device and sets status to unassigned', async () => {
      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(mockDbGpsDevice as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValueOnce(mockDbVehicle as never);
      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValueOnce(mockDbVehicle as never);
      const closeSpy = vi.spyOn(adminGpsRepository, 'closeActiveAssignmentHistory').mockResolvedValueOnce({ count: 1 } as never);
      vi.spyOn(adminGpsRepository, 'update').mockResolvedValueOnce({
        ...mockDbGpsDevice,
        vehicleId: null,
        status: GpsDeviceStatus.UNASSIGNED,
      } as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${mockDbGpsDevice.id}/unbind`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          notes: 'Maintenance removal',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('unassigned');
      expect(res.body.data.vehicleId).toBeNull();
      expect(closeSpy).toHaveBeenCalledWith(mockDbGpsDevice.id, 'UNBOUND', expect.anything(), 'Maintenance removal');
    });

    it('rejects unbinding when device is not bound to any vehicle', async () => {
      const unassignedDevice = {
        ...mockDbGpsDevice,
        vehicleId: null,
        status: GpsDeviceStatus.UNASSIGNED,
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(unassignedDevice as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${unassignedDevice.id}/unbind`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('not bound');
    });
  });

  describe('Device Deactivation (POST /api/v1/admin/gps/:id/deactivate)', () => {
    it('deactivates an active device, closing history and unlinking vehicle', async () => {
      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(mockDbGpsDevice as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValueOnce(mockDbVehicle as never);
      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValueOnce(mockDbVehicle as never);
      const closeSpy = vi.spyOn(adminGpsRepository, 'closeActiveAssignmentHistory').mockResolvedValueOnce({ count: 1 } as never);
      vi.spyOn(adminGpsRepository, 'update').mockResolvedValueOnce({
        ...mockDbGpsDevice,
        vehicleId: null,
        status: GpsDeviceStatus.DEACTIVATED,
      } as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${mockDbGpsDevice.id}/deactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          reason: 'Hardware retired',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('deactivated');
      expect(closeSpy).toHaveBeenCalledWith(mockDbGpsDevice.id, 'DEACTIVATED', expect.anything(), 'Hardware retired');
    });

    it('rejects deactivating an already deactivated device', async () => {
      const alreadyDeactivated = {
        ...mockDbGpsDevice,
        vehicleId: null,
        status: GpsDeviceStatus.DEACTIVATED,
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(alreadyDeactivated as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${alreadyDeactivated.id}/deactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already deactivated');
    });
  });

  describe('Geofence Management (/api/v1/admin/gps/:id/geofences)', () => {
    it('lists geofences for a bound device associated vehicle', async () => {
      vi.spyOn(adminGpsRepository, 'findById').mockResolvedValueOnce(mockDbGpsDevice as never);
      vi.spyOn(adminGpsRepository, 'listGeofencesByVehicleId').mockResolvedValueOnce(mockDbVehicle.geofences as never);

      const res = await request(app)
        .get(`/api/v1/admin/gps/${mockDbGpsDevice.id}/geofences`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Home Zone');
    });

    it('creates a geofence for the associated vehicle with valid coordinates and radius', async () => {
      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(mockDbGpsDevice as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValueOnce(mockDbVehicle as never);
      vi.spyOn(adminGpsRepository, 'createGeofence').mockResolvedValueOnce({
        id: 'gf_new_2',
        vehicleId: mockDbVehicle.id,
        name: 'Office Zone',
        latitude: 18.5500,
        longitude: 73.8900,
        radiusMeters: 300,
        isActive: true,
        createdAt: new Date('2026-10-14T12:00:00Z'),
        updatedAt: new Date('2026-10-14T12:00:00Z'),
      } as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${mockDbGpsDevice.id}/geofences`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Office Zone',
          latitude: 18.5500,
          longitude: 73.8900,
          radiusMeters: 300,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Office Zone');
      expect(res.body.data.radiusMeters).toBe(300);
    });

    it('rejects geofence creation when device is not assigned to any vehicle', async () => {
      const unassignedDevice = {
        ...mockDbGpsDevice,
        vehicleId: null,
      };

      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(unassignedDevice as never);

      const res = await request(app)
        .post(`/api/v1/admin/gps/${unassignedDevice.id}/geofences`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Office Zone',
          latitude: 18.5500,
          longitude: 73.8900,
          radiusMeters: 300,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('assigned to a vehicle');
    });

    it('rejects geofence creation with invalid coordinates or negative radius', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/gps/${mockDbGpsDevice.id}/geofences`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Invalid Zone',
          latitude: 195.0, // Invalid lat > 90
          longitude: 73.89,
          radiusMeters: -100, // Invalid negative radius
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('deletes a geofence verifying ownership by vehicle', async () => {
      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(mockDbGpsDevice as never);
      vi.spyOn(adminGpsRepository, 'findGeofenceById').mockResolvedValueOnce(mockDbVehicle.geofences[0] as never);
      vi.spyOn(adminGpsRepository, 'lockVehicleById').mockResolvedValueOnce(mockDbVehicle as never);
      const deleteSpy = vi.spyOn(adminGpsRepository, 'deleteGeofence').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .delete(`/api/v1/admin/gps/${mockDbGpsDevice.id}/geofences/gf_test_1`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith('gf_test_1', expect.anything());
    });

    it('rejects deleting geofence belonging to another vehicle with 404', async () => {
      vi.spyOn(adminGpsRepository, 'lockById').mockResolvedValueOnce(mockDbGpsDevice as never);
      vi.spyOn(adminGpsRepository, 'findGeofenceById').mockResolvedValueOnce({
        id: 'gf_other_vehicle_1',
        vehicleId: 'veh_different_999',
        name: 'Secret Zone',
      } as never);

      const res = await request(app)
        .delete(`/api/v1/admin/gps/${mockDbGpsDevice.id}/geofences/gf_other_vehicle_1`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Trips & Telemetry Endpoint (GET /api/v1/admin/gps/:id/trips)', () => {
    it('returns empty trips list honestly representing Phase 3 scope', async () => {
      vi.spyOn(adminGpsRepository, 'findById').mockResolvedValueOnce(mockDbGpsDevice as never);

      const res = await request(app)
        .get(`/api/v1/admin/gps/${mockDbGpsDevice.id}/trips`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trips).toEqual([]);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.note).toContain('Phase 4');
    });
  });
});
