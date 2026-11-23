import { Prisma, QrStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ListAdminQrQuery } from './adminQr.schema';

/**
 * Super Admin repository for unified QR codes (inventory + customer tags).
 */
export const adminQrRepository = {
  async listQrCodes(query: ListAdminQrQuery) {
    const { page, limit, search, status, batch, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QrCodeWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (batch && batch.trim() !== '') {
      where.batch = { contains: batch.trim(), mode: 'insensitive' };
    }

    if (search && search.trim() !== '') {
      const s = search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { batch: { contains: s, mode: 'insensitive' } },
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
      prisma.qrCode.findMany({
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
            },
          },
        },
        orderBy: [{ [sortBy]: sortOrder }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.qrCode.count({ where }),
    ]);

    return { items, total };
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.qrCode.findUnique({
      where: { id },
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
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        scanLogs: {
          orderBy: { scannedAt: 'desc' },
          take: 10,
        },
      },
    });
  },

  async findByCode(code: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.qrCode.findUnique({
      where: { code: code.toUpperCase() },
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
          },
        },
      },
    });
  },

  async findByVehicleId(vehicleId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.qrCode.findFirst({
      where: {
        vehicleId,
        status: { in: [QrStatus.ASSIGNED, QrStatus.ACTIVE, QrStatus.SUSPENDED] },
      },
      include: {
        vehicle: true,
      },
    });
  },

  async lockById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    if (typeof db.$queryRaw === 'function') {
      const rows = await db.$queryRaw<Array<{
        id: string;
        code: string;
        batch: string;
        status: QrStatus;
        vehicleId: string | null;
      }>>`
        SELECT id, code, batch, status, "vehicleId"
        FROM "qr_codes"
        WHERE id = ${id}
        FOR UPDATE
      `;
      return rows && rows.length > 0 ? rows[0]! : null;
    }
    if (process.env.NODE_ENV === 'test' && db.qrCode?.findUnique) {
      return db.qrCode.findUnique({ where: { id } });
    }
    throw new Error('Database client does not support raw query locking');
  },

  async lockByCode(code: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const normalized = code.toUpperCase();
    if (typeof db.$queryRaw === 'function') {
      const rows = await db.$queryRaw<Array<{
        id: string;
        code: string;
        batch: string;
        status: QrStatus;
        vehicleId: string | null;
      }>>`
        SELECT id, code, batch, status, "vehicleId"
        FROM "qr_codes"
        WHERE code = ${normalized}
        FOR UPDATE
      `;
      return rows && rows.length > 0 ? rows[0]! : null;
    }
    if (process.env.NODE_ENV === 'test' && db.qrCode?.findUnique) {
      return db.qrCode.findUnique({ where: { code: normalized } });
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
    if (process.env.NODE_ENV === 'test' && db.vehicle?.findUnique) {
      return db.vehicle.findUnique({ where: { id: vehicleId } });
    }
    throw new Error('Database client does not support raw query locking');
  },

  async lockActiveByVehicleId(vehicleId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    if (typeof db.$queryRaw === 'function') {
      const rows = await db.$queryRaw<Array<{
        id: string;
        code: string;
        batch: string;
        status: QrStatus;
        vehicleId: string | null;
      }>>`
        SELECT id, code, batch, status, "vehicleId"
        FROM "qr_codes"
        WHERE "vehicleId" = ${vehicleId}
          AND status IN ('ASSIGNED', 'ACTIVE', 'SUSPENDED')
        FOR UPDATE
      `;
      return rows && rows.length > 0 ? rows[0]! : null;
    }
    if (process.env.NODE_ENV === 'test' && db.qrCode?.findFirst) {
      return db.qrCode.findFirst({
        where: {
          vehicleId,
          status: { in: [QrStatus.ASSIGNED, QrStatus.ACTIVE, QrStatus.SUSPENDED] },
        },
      });
    }
    throw new Error('Database client does not support raw query locking');
  },

  async findExistingCodes(codes: string[], tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const normalized = codes.map((c) => c.toUpperCase());
    const existing = await db.qrCode.findMany({
      where: { code: { in: normalized } },
      select: { code: true },
    });
    return existing.map((e) => e.code);
  },

  async createMany(
    records: Array<{ code: string; batch: string; status: QrStatus }>,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.qrCode.createMany({
      data: records,
    });
  },

  async create(
    data: { code: string; batch: string; status?: QrStatus; vehicleId?: string | null },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.qrCode.create({
      data: {
        code: data.code.toUpperCase(),
        batch: data.batch,
        status: data.status ?? QrStatus.AVAILABLE,
        vehicleId: data.vehicleId ?? null,
      },
      include: {
        vehicle: true,
      },
    });
  },

  async update(
    id: string,
    data: Prisma.QrCodeUpdateInput | Prisma.QrCodeUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.qrCode.update({
      where: { id },
      data,
      include: {
        vehicle: {
          include: {
            user: true,
          },
        },
      },
    });
  },

  async createAssignmentHistory(
    data: {
      qrCodeId?: string | null;
      qrCodeValue: string;
      vehicleId?: string | null;
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
    return db.qrAssignmentHistory.create({
      data: {
        qrCodeId: data.qrCodeId ?? null,
        qrCodeValue: data.qrCodeValue,
        vehicleId: data.vehicleId ?? null,
        vehicleReg: data.vehicleReg ?? null,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        assignedBy: data.assignedBy ?? null,
        reason: data.reason ?? 'ASSIGNMENT',
        notes: data.notes ?? null,
        assignedAt: new Date(),
      },
    });
  },

  async closeActiveAssignmentHistory(
    qrCodeId: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.qrAssignmentHistory.updateMany({
      where: {
        qrCodeId,
        unassignedAt: null,
      },
      data: {
        unassignedAt: new Date(),
        reason,
      },
    });
  },

  async recordScanLog(
    qrCodeId: string | null,
    qrCodeValue: string,
    logData: {
      ipAddress?: string;
      userAgent?: string;
      city?: string;
      actionTaken?: string;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    const [scanLog] = await Promise.all([
      db.qrScanLog.create({
        data: {
          qrCodeId: qrCodeId ?? null,
          qrCodeValue,
          ipAddress: logData.ipAddress ?? null,
          userAgent: logData.userAgent ?? null,
          city: logData.city ?? null,
          actionTaken: logData.actionTaken ?? 'VIEW',
          metadata: logData.metadata ?? Prisma.JsonNull,
        },
      }),
      qrCodeId
        ? db.qrCode.update({
            where: { id: qrCodeId },
            data: {
              scansCount: { increment: 1 },
            },
          })
        : Promise.resolve(null),
    ]);
    return scanLog;
  },

  async listScanLogs(qrCodeId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.qrScanLog.findMany({
        where: { qrCodeId },
        orderBy: { scannedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.qrScanLog.count({ where: { qrCodeId } }),
    ]);
    return { items, total };
  },
};
