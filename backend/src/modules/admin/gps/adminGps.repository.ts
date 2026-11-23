import { GpsDeviceStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ListAdminGpsQuery } from './adminGps.schema';

export const adminGpsRepository = {
  async listGpsDevices(query: ListAdminGpsQuery) {
    const { page, limit, search, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GPSDeviceWhereInput = {};

    if (status) {
      const statusMap: Record<string, GpsDeviceStatus> = {
        unassigned: GpsDeviceStatus.UNASSIGNED,
        active: GpsDeviceStatus.ACTIVE,
        maintenance: GpsDeviceStatus.MAINTENANCE,
        deactivated: GpsDeviceStatus.DEACTIVATED,
      };
      where.status = statusMap[status];
    }

    if (search && search.trim() !== '') {
      const s = search.trim();
      where.OR = [
        { imei: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { vendor: { contains: s, mode: 'insensitive' } },
        {
          vehicle: {
            OR: [
              { reg: { contains: s, mode: 'insensitive' } },
              { model: { contains: s, mode: 'insensitive' } },
              {
                user: {
                  OR: [
                    { firstName: { contains: s, mode: 'insensitive' } },
                    { lastName: { contains: s, mode: 'insensitive' } },
                    { email: { contains: s, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.gPSDevice.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              reg: true,
              model: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              _count: {
                select: { geofences: true },
              },
            },
          },
        },
        orderBy: [{ [sortBy]: sortOrder }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.gPSDevice.count({ where }),
    ]);

    return { items, total };
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.gPSDevice.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            geofences: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        history: {
          include: {
            vehicle: {
              select: {
                id: true,
                reg: true,
                model: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });
  },

  async findByImei(imei: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.gPSDevice.findUnique({
      where: { imei },
    });
  },

  async findBySerialNumber(serialNumber: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.gPSDevice.findUnique({
      where: { serialNumber },
    });
  },

  async lockById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    if (typeof db.$queryRaw === 'function') {
      const rows = await db.$queryRaw<Array<{
        id: string;
        imei: string;
        serialNumber: string | null;
        model: string | null;
        vendor: string | null;
        status: GpsDeviceStatus;
        vehicleId: string | null;
      }>>`
        SELECT id, imei, "serialNumber", model, vendor, status, "vehicleId"
        FROM "gps_devices"
        WHERE id = ${id}
        FOR UPDATE
      `;
      return rows && rows.length > 0 ? rows[0]! : null;
    }
    if (process.env.NODE_ENV === 'test') {
      return (db as unknown as { gPSDevice?: { findUnique?: (args: unknown) => Promise<unknown> } }).gPSDevice?.findUnique
        ? ((await (db as unknown as { gPSDevice: { findUnique: (args: unknown) => Promise<unknown> } }).gPSDevice.findUnique({ where: { id } })) as never)
        : null;
    }
    throw new Error('Database client does not support raw query locking');
  },

  async lockByVehicleId(vehicleId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    if (typeof db.$queryRaw === 'function') {
      const rows = await db.$queryRaw<Array<{
        id: string;
        imei: string;
        serialNumber: string | null;
        model: string | null;
        vendor: string | null;
        status: GpsDeviceStatus;
        vehicleId: string | null;
      }>>`
        SELECT id, imei, "serialNumber", model, vendor, status, "vehicleId"
        FROM "gps_devices"
        WHERE "vehicleId" = ${vehicleId}
        FOR UPDATE
      `;
      return rows && rows.length > 0 ? rows[0]! : null;
    }
    if (process.env.NODE_ENV === 'test') {
      return (db as unknown as { gPSDevice?: { findFirst?: (args: unknown) => Promise<unknown> } }).gPSDevice?.findFirst
        ? ((await (db as unknown as { gPSDevice: { findFirst: (args: unknown) => Promise<unknown> } }).gPSDevice.findFirst({ where: { vehicleId } })) as never)
        : null;
    }
    throw new Error('Database client does not support raw query locking');
  },

  async lockVehicleById(vehicleId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    if (typeof db.$queryRaw === 'function') {
      const rows = await db.$queryRaw<Array<{
        id: string;
        reg: string;
        userId: string;
      }>>`
        SELECT id, reg, "userId"
        FROM "vehicles"
        WHERE id = ${vehicleId}
        FOR UPDATE
      `;
      return rows && rows.length > 0 ? rows[0]! : null;
    }
    if (process.env.NODE_ENV === 'test') {
      return (db as unknown as { vehicle?: { findUnique?: (args: unknown) => Promise<unknown> } }).vehicle?.findUnique
        ? ((await (db as unknown as { vehicle: { findUnique: (args: unknown) => Promise<unknown> } }).vehicle.findUnique({ where: { id: vehicleId } })) as never)
        : null;
    }
    throw new Error('Database client does not support raw query locking');
  },

  async create(
    data: {
      imei: string;
      serialNumber?: string | null;
      model?: string | null;
      vendor?: string | null;
      status?: GpsDeviceStatus;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.gPSDevice.create({
      data: {
        imei: data.imei,
        serialNumber: data.serialNumber ?? null,
        model: data.model ?? null,
        vendor: data.vendor ?? null,
        status: data.status ?? GpsDeviceStatus.UNASSIGNED,
      },
    });
  },

  async update(
    id: string,
    data: Prisma.GPSDeviceUpdateInput | Prisma.GPSDeviceUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.gPSDevice.update({
      where: { id },
      data,
      include: {
        vehicle: true,
      },
    });
  },

  async createAssignmentHistory(
    data: {
      deviceId: string;
      deviceImei: string;
      vehicleId: string;
      vehicleReg?: string | null;
      userId?: string | null;
      userEmail?: string | null;
      assignedBy?: string | null;
      reason?: string | null;
      notes?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.gPSDeviceHistory.create({
      data: {
        deviceId: data.deviceId,
        deviceImei: data.deviceImei,
        vehicleId: data.vehicleId,
        vehicleReg: data.vehicleReg ?? null,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        assignedBy: data.assignedBy ?? null,
        assignedAt: new Date(),
        reason: data.reason ?? null,
        notes: data.notes ?? null,
      },
    });
  },

  async closeActiveAssignmentHistory(
    deviceId: string,
    reason: string,
    tx?: Prisma.TransactionClient,
    notes?: string,
  ) {
    const db = tx ?? prisma;
    return db.gPSDeviceHistory.updateMany({
      where: {
        deviceId,
        unassignedAt: null,
      },
      data: {
        unassignedAt: new Date(),
        reason,
        ...(notes ? { notes } : {}),
      },
    });
  },

  async listGeofencesByVehicleId(vehicleId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.geofence.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createGeofence(
    data: {
      vehicleId: string;
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
      isActive?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.geofence.create({
      data: {
        vehicleId: data.vehicleId,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
        isActive: data.isActive ?? true,
      },
    });
  },

  async findGeofenceById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.geofence.findUnique({
      where: { id },
    });
  },

  async deleteGeofence(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.geofence.delete({
      where: { id },
    });
  },

  async countGpsMetrics(tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const [total, active, unassigned, maintenance, deactivated] = await Promise.all([
      db.gPSDevice.count(),
      db.gPSDevice.count({ where: { status: GpsDeviceStatus.ACTIVE } }),
      db.gPSDevice.count({ where: { status: GpsDeviceStatus.UNASSIGNED } }),
      db.gPSDevice.count({ where: { status: GpsDeviceStatus.MAINTENANCE } }),
      db.gPSDevice.count({ where: { status: GpsDeviceStatus.DEACTIVATED } }),
    ]);

    return { total, active, unassigned, maintenance, deactivated };
  },

  async recordTelemetry(
    data: {
      imei: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      batteryLevel?: number;
      signalStrength?: string;
      altitude?: number;
      timestamp?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    const device = await db.gPSDevice.findUnique({
      where: { imei: data.imei },
      include: {
        vehicle: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!device) return null;

    const updatedDevice = await db.gPSDevice.update({
      where: { id: device.id },
      data: {
        lastLatitude: data.latitude,
        lastLongitude: data.longitude,
        speed: data.speed ?? 0,
        heading: data.heading ?? 0,
        batteryLevel: data.batteryLevel ?? device.batteryLevel ?? 90,
        signalStrength: data.signalStrength ?? device.signalStrength ?? 'Strong',
        lastSeenAt: data.timestamp ? new Date(data.timestamp) : new Date(),
        status: device.vehicleId && device.status === GpsDeviceStatus.UNASSIGNED ? GpsDeviceStatus.ACTIVE : device.status,
      },
    });

    // Record breadcrumb running history in GPSDeviceHistory
    const historyEntry = await db.gPSDeviceHistory.create({
      data: {
        deviceId: device.id,
        deviceImei: device.imei,
        vehicleId: device.vehicleId,
        vehicleReg: device.vehicle?.reg ?? null,
        userId: device.vehicle?.user?.id ?? null,
        userEmail: device.vehicle?.user?.email ?? null,
        reason: 'TELEMETRY_PING',
        notes: JSON.stringify({
          lat: data.latitude,
          lng: data.longitude,
          speed: data.speed ?? 0,
          heading: data.heading ?? 0,
          battery: data.batteryLevel ?? 90,
          signal: data.signalStrength ?? 'Strong',
          altitude: data.altitude,
          recordedAt: data.timestamp || new Date().toISOString(),
        }),
      },
    });

    return { device: updatedDevice, history: historyEntry };
  },

  async getTelemetryHistory(deviceId: string, limit: number = 50, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.gPSDeviceHistory.findMany({
      where: {
        deviceId,
        reason: 'TELEMETRY_PING',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
