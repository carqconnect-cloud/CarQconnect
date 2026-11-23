import { GpsDeviceStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { auditService } from '../../audit/audit.service';
import { realTimeService } from '../../../common/services/socket.service';
import { adminGpsRepository } from './adminGps.repository';
import {
  AssignGpsInput,
  CreateGeofenceInput,
  DeactivateGpsInput,
  ListAdminGpsQuery,
  RegisterGpsDeviceInput,
  UnbindGpsInput,
  RecordTelemetryInput,
} from './adminGps.schema';

function formatGpsStatus(status: GpsDeviceStatus): 'unassigned' | 'active' | 'maintenance' | 'deactivated' {
  switch (status) {
    case GpsDeviceStatus.UNASSIGNED:
      return 'unassigned';
    case GpsDeviceStatus.ACTIVE:
      return 'active';
    case GpsDeviceStatus.MAINTENANCE:
      return 'maintenance';
    case GpsDeviceStatus.DEACTIVATED:
      return 'deactivated';
    default:
      return 'unassigned';
  }
}

export const adminGpsService = {
  async listGpsDevices(query: ListAdminGpsQuery) {
    const { items, total } = await adminGpsRepository.listGpsDevices(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    const formatted = items.map((g) => ({
      id: g.id,
      imei: g.imei,
      serialNumber: g.serialNumber,
      model: g.model,
      vendor: g.vendor,
      status: formatGpsStatus(g.status),
      vehicleId: g.vehicleId,
      vehicleReg: g.vehicle?.reg ?? null,
      vehicleModel: g.vehicle?.model ?? null,
      battery: g.batteryLevel ?? null,
      signal: g.signalStrength ?? null,
      lastSeen: g.lastSeenAt ? g.lastSeenAt.toISOString() : null,
      lastLatitude: g.lastLatitude ?? null,
      lastLongitude: g.lastLongitude ?? null,
      geofences: g.vehicle?._count?.geofences ?? 0,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    return {
      items: formatted,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  },

  async getGpsDeviceById(id: string) {
    const g = await adminGpsRepository.findById(id);

    if (!g) {
      throw ApiError.notFound('GPS device not found');
    }

    const historyTimeline = g.history.map((h) => ({
      id: h.id,
      deviceId: h.deviceId,
      deviceImei: h.deviceImei,
      vehicleId: h.vehicleId,
      vehicleReg: h.vehicleReg ?? h.vehicle?.reg ?? null,
      vehicleModel: h.vehicle?.model ?? null,
      userId: h.userId,
      userEmail: h.userEmail,
      assignedBy: h.assignedBy,
      assignedAt: h.assignedAt.toISOString(),
      unassignedAt: h.unassignedAt ? h.unassignedAt.toISOString() : null,
      reason: h.reason,
      notes: h.notes,
    }));

    const geofences = g.vehicle?.geofences.map((gf) => ({
      id: gf.id,
      vehicleId: gf.vehicleId,
      name: gf.name,
      latitude: gf.latitude,
      longitude: gf.longitude,
      radiusMeters: gf.radiusMeters,
      isActive: gf.isActive,
      createdAt: gf.createdAt.toISOString(),
      updatedAt: gf.updatedAt.toISOString(),
    })) ?? [];

    return {
      id: g.id,
      imei: g.imei,
      serialNumber: g.serialNumber,
      model: g.model,
      vendor: g.vendor,
      status: formatGpsStatus(g.status),
      vehicleId: g.vehicleId,
      vehicleReg: g.vehicle?.reg ?? null,
      vehicleModel: g.vehicle?.model ?? null,
      battery: g.batteryLevel ?? null,
      signal: g.signalStrength ?? null,
      lastSeen: g.lastSeenAt ? g.lastSeenAt.toISOString() : null,
      lastLatitude: g.lastLatitude ?? null,
      lastLongitude: g.lastLongitude ?? null,
      speed: g.speed ?? null,
      heading: g.heading ?? null,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      vehicle: g.vehicle
        ? {
            id: g.vehicle.id,
            reg: g.vehicle.reg,
            model: g.vehicle.model,
            owner: g.vehicle.user
              ? {
                  id: g.vehicle.user.id,
                  firstName: g.vehicle.user.firstName,
                  lastName: g.vehicle.user.lastName,
                  email: g.vehicle.user.email,
                  phone: g.vehicle.user.phone,
                }
              : null,
          }
        : null,
      history: historyTimeline,
      geofences,
    };
  },

  async registerGpsDevice(
    input: RegisterGpsDeviceInput,
    actorId: string,
    ipAddress?: string,
  ) {
    const normalizedImei = input.imei.trim();
    const existingImei = await adminGpsRepository.findByImei(normalizedImei);

    if (existingImei) {
      throw ApiError.conflict(`GPS device with IMEI '${normalizedImei}' already exists`);
    }

    let normalizedSerial: string | null = null;
    if (input.serialNumber && input.serialNumber.trim() !== '') {
      normalizedSerial = input.serialNumber.trim();
      const existingSerial = await adminGpsRepository.findBySerialNumber(normalizedSerial);
      if (existingSerial) {
        throw ApiError.conflict(
          `GPS device with serial number '${normalizedSerial}' already exists`,
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const device = await adminGpsRepository.create(
        {
          imei: normalizedImei,
          serialNumber: normalizedSerial,
          model: input.model?.trim() || null,
          vendor: input.vendor?.trim() || null,
          status: GpsDeviceStatus.UNASSIGNED,
        },
        tx,
      );

      await auditService.record(
        {
          actorId,
          action: 'admin.gps_registered',
          entity: 'GPSDevice',
          entityId: device.id,
          metadata: {
            imei: device.imei,
            serialNumber: device.serialNumber,
            model: device.model,
            vendor: device.vendor,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: device.id,
        imei: device.imei,
        serialNumber: device.serialNumber,
        model: device.model,
        vendor: device.vendor,
        status: formatGpsStatus(device.status),
        createdAt: device.createdAt.toISOString(),
      };
    });
  },

  async assignGps(
    id: string,
    input: AssignGpsInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Strict table-level lock ordering: Always lock gps_devices first
      const device = await adminGpsRepository.lockById(id, tx);

      if (!device) {
        throw ApiError.notFound('GPS device not found');
      }

      if (device.status === GpsDeviceStatus.MAINTENANCE) {
        throw ApiError.badRequest(
          'Cannot assign GPS device in maintenance status. It must be inspected and cleared before assignment.',
        );
      }

      if (device.status === GpsDeviceStatus.DEACTIVATED) {
        throw ApiError.badRequest(
          'Cannot assign GPS device in deactivated status. It has been permanently retired.',
        );
      }

      // 2. Lock target vehicle(s) in deterministic order
      if (device.vehicleId && device.vehicleId !== input.vehicleId) {
        const [firstId, secondId] = [device.vehicleId, input.vehicleId].sort();
        await adminGpsRepository.lockVehicleById(firstId!, tx);
        await adminGpsRepository.lockVehicleById(secondId!, tx);
      } else {
        await adminGpsRepository.lockVehicleById(input.vehicleId, tx);
      }

      const vehicle = await tx.vehicle.findUnique({
        where: { id: input.vehicleId },
        include: { user: true },
      });

      if (!vehicle) {
        throw ApiError.notFound('Target vehicle not found');
      }

      if (device.vehicleId === vehicle.id) {
        throw ApiError.conflict(
          `GPS device '${device.imei}' is already assigned to vehicle ${vehicle.reg}`,
        );
      }

      // Enforce at most one active GPS device per vehicle
      const existingActiveGps = await tx.gPSDevice.findFirst({
        where: {
          vehicleId: vehicle.id,
          id: { not: device.id },
          status: GpsDeviceStatus.ACTIVE,
        },
      });

      if (existingActiveGps) {
        throw ApiError.conflict(
          `Vehicle ${vehicle.reg} already has an active GPS device (${existingActiveGps.imei}). Reassign or unbind it first.`,
        );
      }

      const isReassignment = Boolean(device.vehicleId && device.vehicleId !== vehicle.id);

      // If reassignment, close active assignment history for the prior vehicle
      if (isReassignment) {
        await adminGpsRepository.closeActiveAssignmentHistory(
          device.id,
          'REASSIGNMENT',
          tx,
          input.notes,
        );
      }

      const updated = await adminGpsRepository.update(
        device.id,
        {
          vehicleId: vehicle.id,
          status: GpsDeviceStatus.ACTIVE,
        },
        tx,
      );

      await adminGpsRepository.createAssignmentHistory(
        {
          deviceId: device.id,
          deviceImei: device.imei,
          vehicleId: vehicle.id,
          vehicleReg: vehicle.reg,
          userId: vehicle.userId,
          userEmail: vehicle.user?.email ?? null,
          assignedBy: actorId,
          reason: isReassignment ? 'REASSIGNMENT' : 'INITIAL_ASSIGNMENT',
          notes: input.notes,
        },
        tx,
      );

      await auditService.record(
        {
          actorId,
          action: isReassignment ? 'admin.gps_reassigned' : 'admin.gps_assigned',
          entity: 'GPSDevice',
          entityId: device.id,
          metadata: {
            imei: device.imei,
            targetVehicleId: vehicle.id,
            targetVehicleReg: vehicle.reg,
            previousVehicleId: device.vehicleId,
            mode: isReassignment ? 'REASSIGN' : 'ASSIGN',
            notes: input.notes,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: updated.id,
        imei: updated.imei,
        status: formatGpsStatus(updated.status),
        vehicleId: vehicle.id,
        vehicleReg: vehicle.reg,
        assignedAt: new Date().toISOString(),
      };
    });
  },

  async unbindGps(
    id: string,
    input: UnbindGpsInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Strict table-level lock ordering: Lock gps_devices first
      const device = await adminGpsRepository.lockById(id, tx);

      if (!device) {
        throw ApiError.notFound('GPS device not found');
      }

      if (!device.vehicleId) {
        throw ApiError.badRequest('GPS device is not bound to any vehicle');
      }

      // 2. Lock vehicle second
      await adminGpsRepository.lockVehicleById(device.vehicleId, tx);

      const vehicle = await tx.vehicle.findUnique({
        where: { id: device.vehicleId },
      });

      await adminGpsRepository.closeActiveAssignmentHistory(
        device.id,
        'UNBOUND',
        tx,
        input.notes,
      );

      const updated = await adminGpsRepository.update(
        device.id,
        {
          vehicleId: null,
          status: GpsDeviceStatus.UNASSIGNED,
        },
        tx,
      );

      await auditService.record(
        {
          actorId,
          action: 'admin.gps_unbound',
          entity: 'GPSDevice',
          entityId: device.id,
          metadata: {
            imei: device.imei,
            unboundVehicleId: device.vehicleId,
            unboundVehicleReg: vehicle?.reg ?? null,
            notes: input.notes,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: updated.id,
        imei: updated.imei,
        status: formatGpsStatus(updated.status),
        vehicleId: null,
        vehicleReg: null,
        unboundAt: new Date().toISOString(),
      };
    });
  },

  async deactivateGps(
    id: string,
    input: DeactivateGpsInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Strict lock ordering: Lock gps_devices first
      const device = await adminGpsRepository.lockById(id, tx);

      if (!device) {
        throw ApiError.notFound('GPS device not found');
      }

      if (device.status === GpsDeviceStatus.DEACTIVATED) {
        throw ApiError.badRequest('GPS device is already deactivated');
      }

      let unboundVehicleReg: string | null = null;
      if (device.vehicleId) {
        await adminGpsRepository.lockVehicleById(device.vehicleId, tx);
        const vehicle = await tx.vehicle.findUnique({
          where: { id: device.vehicleId },
        });
        unboundVehicleReg = vehicle?.reg ?? null;

        await adminGpsRepository.closeActiveAssignmentHistory(
          device.id,
          'DEACTIVATED',
          tx,
          input.notes || input.reason,
        );
      }

      const updated = await adminGpsRepository.update(
        device.id,
        {
          vehicleId: null,
          status: GpsDeviceStatus.DEACTIVATED,
        },
        tx,
      );

      await auditService.record(
        {
          actorId,
          action: 'admin.gps_deactivated',
          entity: 'GPSDevice',
          entityId: device.id,
          metadata: {
            imei: device.imei,
            previousStatus: device.status,
            previousVehicleId: device.vehicleId,
            previousVehicleReg: unboundVehicleReg,
            reason: input.reason,
            notes: input.notes,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: updated.id,
        imei: updated.imei,
        status: formatGpsStatus(updated.status),
        vehicleId: null,
        deactivatedAt: new Date().toISOString(),
      };
    });
  },

  async recordTelemetry(input: RecordTelemetryInput) {
    const result = await adminGpsRepository.recordTelemetry(input);
    if (!result) {
      throw ApiError.notFound('GPS device with specified IMEI not found');
    }

    const { device } = result;

    // Dispatches real-time WebSocket update to vehicle subscriber room and admin room
    const locationPayload = {
      lat: input.latitude,
      lng: input.longitude,
      speed: input.speed ?? 0,
      heading: input.heading ?? 0,
      timestamp: new Date().toISOString(),
    };

    if (device.vehicleId) {
      realTimeService.broadcastGpsLocation(device.vehicleId, locationPayload);
    } else {
      realTimeService.emitToAdmin('gps:fleet_update', {
        imei: device.imei,
        vehicleId: null,
        ...locationPayload,
      });
    }

    return {
      success: true,
      deviceId: device.id,
      imei: device.imei,
      vehicleId: device.vehicleId,
      status: formatGpsStatus(device.status),
      lastLatitude: device.lastLatitude,
      lastLongitude: device.lastLongitude,
      speed: device.speed,
      batteryLevel: device.batteryLevel,
      signalStrength: device.signalStrength,
      lastSeenAt: device.lastSeenAt?.toISOString(),
    };
  },

  async getTrips(id: string) {
    const device = await adminGpsRepository.findById(id);

    if (!device) {
      throw ApiError.notFound('GPS device not found');
    }

    const rawHistory = await adminGpsRepository.getTelemetryHistory(device.id, 60);

    const breadcrumbs = rawHistory
      .map((h) => {
        try {
          if (!h.notes) return null;
          const parsed = JSON.parse(h.notes);
          return {
            id: h.id,
            lat: parsed.lat,
            lng: parsed.lng,
            speed: parsed.speed ?? 0,
            heading: parsed.heading ?? 0,
            battery: parsed.battery ?? 85,
            signal: parsed.signal ?? 'Strong',
            recordedAt: parsed.recordedAt || h.createdAt.toISOString(),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // If trips exist for user in trips table, also fetch them
    let userTrips: any[] = [];
    if (device.vehicle?.userId) {
      userTrips = await prisma.trip.findMany({
        where: { userId: device.vehicle.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    const formattedTrips = userTrips.map((t) => ({
      id: t.id,
      title: t.title || `${t.fromName} → ${t.toName}`,
      distanceKm: t.distance ? parseFloat(t.distance) || 12 : 12,
      durationMin: t.duration ? parseInt(t.duration) || 25 : 25,
      fromName: t.fromName,
      toName: t.toName,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      deviceId: device.id,
      imei: device.imei,
      vehicleReg: device.vehicle?.reg || null,
      lastLatitude: device.lastLatitude,
      lastLongitude: device.lastLongitude,
      speed: device.speed,
      heading: device.heading,
      batteryLevel: device.batteryLevel,
      signalStrength: device.signalStrength,
      trips: formattedTrips,
      breadcrumbs,
      totalBreadcrumbs: breadcrumbs.length,
      total: formattedTrips.length,
    };
  },

  async getHistory(id: string) {
    return this.getTrips(id);
  },

  async listGeofences(deviceId: string) {
    const device = await adminGpsRepository.findById(deviceId);

    if (!device) {
      throw ApiError.notFound('GPS device not found');
    }

    if (!device.vehicleId) {
      return [];
    }

    const geofences = await adminGpsRepository.listGeofencesByVehicleId(device.vehicleId);

    return geofences.map((gf) => ({
      id: gf.id,
      vehicleId: gf.vehicleId,
      name: gf.name,
      latitude: gf.latitude,
      longitude: gf.longitude,
      radiusMeters: gf.radiusMeters,
      isActive: gf.isActive,
      createdAt: gf.createdAt.toISOString(),
      updatedAt: gf.updatedAt.toISOString(),
    }));
  },

  async createGeofence(
    deviceId: string,
    input: CreateGeofenceInput,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const device = await adminGpsRepository.lockById(deviceId, tx);

      if (!device) {
        throw ApiError.notFound('GPS device not found');
      }

      if (!device.vehicleId) {
        throw ApiError.badRequest(
          'GPS device must be assigned to a vehicle before configuring geofences.',
        );
      }

      await adminGpsRepository.lockVehicleById(device.vehicleId, tx);

      const geofence = await adminGpsRepository.createGeofence(
        {
          vehicleId: device.vehicleId,
          name: input.name,
          latitude: input.latitude,
          longitude: input.longitude,
          radiusMeters: input.radiusMeters,
          isActive: input.isActive ?? true,
        },
        tx,
      );

      await auditService.record(
        {
          actorId,
          action: 'admin.geofence_created',
          entity: 'Geofence',
          entityId: geofence.id,
          metadata: {
            deviceId: device.id,
            vehicleId: device.vehicleId,
            name: geofence.name,
            latitude: geofence.latitude,
            longitude: geofence.longitude,
            radiusMeters: geofence.radiusMeters,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: geofence.id,
        vehicleId: geofence.vehicleId,
        name: geofence.name,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radiusMeters: geofence.radiusMeters,
        isActive: geofence.isActive,
        createdAt: geofence.createdAt.toISOString(),
        updatedAt: geofence.updatedAt.toISOString(),
      };
    });
  },

  async deleteGeofence(
    deviceId: string,
    geofenceId: string,
    actorId: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const device = await adminGpsRepository.lockById(deviceId, tx);

      if (!device) {
        throw ApiError.notFound('GPS device not found');
      }

      if (!device.vehicleId) {
        throw ApiError.badRequest('GPS device is not assigned to any vehicle');
      }

      const geofence = await adminGpsRepository.findGeofenceById(geofenceId, tx);

      if (!geofence || geofence.vehicleId !== device.vehicleId) {
        throw ApiError.notFound(
          'Geofence not found for this device associated vehicle',
        );
      }

      await adminGpsRepository.lockVehicleById(device.vehicleId, tx);
      await adminGpsRepository.deleteGeofence(geofenceId, tx);

      await auditService.record(
        {
          actorId,
          action: 'admin.geofence_deleted',
          entity: 'Geofence',
          entityId: geofenceId,
          metadata: {
            deviceId: device.id,
            vehicleId: device.vehicleId,
            name: geofence.name,
          },
          ipAddress,
        },
        tx,
      );

      return {
        id: geofenceId,
        deleted: true,
        deletedAt: new Date().toISOString(),
      };
    });
  },
};
