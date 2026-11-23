import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ListAdminVehiclesQuery } from './adminVehicle.schema';

export const adminVehicleRepository = {
  async listVehicles(query: ListAdminVehiclesQuery) {
    const { page, limit, search, fuel, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};

    if (fuel) {
      where.fuel = fuel;
    }

    if (search && search.trim() !== '') {
      const s = search.trim();
      where.OR = [
        { reg: { contains: s, mode: 'insensitive' } },
        { regNumber: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: s, mode: 'insensitive' } },
              { lastName: { contains: s, mode: 'insensitive' } },
              { email: { contains: s, mode: 'insensitive' } },
              { phone: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
        {
          qrCode: {
            code: { contains: s, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
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
          documents: true,
          qrCode: true,
          gpsDevice: {
            select: {
              id: true,
              imei: true,
              status: true,
            },
          },
        },
        orderBy: [{ [sortBy]: sortOrder }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return { items, total };
  },

  async findById(id: string) {
    return prisma.vehicle.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            reminders: {
              orderBy: { date: 'asc' },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        qrCode: true,
        gpsDevice: true,
      },
    });
  },

  async findAuditActivity(vehicleId: string, limit: number = 20) {
    return prisma.auditLog.findMany({
      where: {
        entity: 'Vehicle',
        entityId: vehicleId,
      },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
