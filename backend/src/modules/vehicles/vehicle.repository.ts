import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateVehicleInput, UpdateVehicleInput, VehicleDocumentInput } from './vehicle.schema';

export const vehicleRepository = {
  async clearDefault(userId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.vehicle.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  },

  async create(userId: string, data: CreateVehicleInput, tx: Prisma.TransactionClient = prisma) {
    const docExpiryDate = data.docExpiry ? new Date(data.docExpiry) : null;

    const vehicle = await tx.vehicle.create({
      data: {
        userId,
        reg: data.reg,
        model: data.model,
        fuel: data.fuel,
        mileage: data.mileage ?? null,
        docExpiry: docExpiryDate,
        isDefault: data.isDefault ?? false,
      },
    });

    if (data.documents && data.documents.length > 0) {
      for (const doc of data.documents) {
        await tx.document.create({
          data: {
            userId,
            vehicleId: vehicle.id,
            title: doc.type,
            docType: doc.type,
            regNumber: doc.documentNumber ?? vehicle.reg ?? null,
            expiryDate: new Date(doc.expiryDate),
            subtitle: doc.notes ?? null,
            status: 'ACTIVE',
          },
        });
      }
    }

    return tx.vehicle.findUnique({
      where: { id: vehicle.id },
      include: { documents: true },
    });
  },

  async listByUser(userId: string) {
    return prisma.vehicle.findMany({
      where: { userId },
      include: {
        documents: true,
        qrCode: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async findByIdAndUser(id: string, userId: string) {
    return prisma.vehicle.findFirst({
      where: { id, userId },
      include: {
        documents: true,
        qrCode: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
    });
  },

  async update(id: string, _userId: string, data: UpdateVehicleInput, tx: Prisma.TransactionClient = prisma) {
    const updateData: Prisma.VehicleUpdateInput = {};

    if (data.reg !== undefined) updateData.reg = data.reg;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.fuel !== undefined) updateData.fuel = data.fuel;
    if (data.mileage !== undefined) updateData.mileage = data.mileage;
    if (data.docExpiry !== undefined) updateData.docExpiry = data.docExpiry ? new Date(data.docExpiry) : null;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    await tx.vehicle.update({
      where: { id },
      data: updateData,
    });

    if (data.documents && data.documents.length > 0) {
      for (const doc of data.documents) {
        const existing = await tx.document.findFirst({
          where: {
            vehicleId: id,
            docType: doc.type,
          },
        });

        if (existing) {
          await tx.document.update({
            where: { id: existing.id },
            data: {
              regNumber: doc.documentNumber ?? undefined,
              expiryDate: new Date(doc.expiryDate),
              subtitle: doc.notes ?? undefined,
            },
          });
        } else {
          const vehicle = await tx.vehicle.findUnique({ where: { id } });
          await tx.document.create({
            data: {
              userId: vehicle?.userId ?? _userId,
              vehicleId: id,
              title: doc.type,
              docType: doc.type,
              regNumber: doc.documentNumber ?? vehicle?.reg ?? null,
              expiryDate: new Date(doc.expiryDate),
              subtitle: doc.notes ?? null,
              status: 'ACTIVE',
            },
          });
        }
      }

      // Automatically synchronize vehicle.docExpiry to the earliest document expiry date
      if (data.docExpiry === undefined) {
        const allDocs = await tx.document.findMany({
          where: { vehicleId: id },
        });
        const dates = allDocs
          .map((d) => (d.expiryDate ? d.expiryDate.getTime() : NaN))
          .filter((t) => !isNaN(t));
        if (dates.length > 0) {
          const earliest = new Date(Math.min(...dates));
          await tx.vehicle.update({
            where: { id },
            data: { docExpiry: earliest },
          });
        }
      }
    }

    return tx.vehicle.findUnique({
      where: { id },
      include: { documents: true },
    });
  },

  async delete(id: string, tx: Prisma.TransactionClient = prisma) {
    return tx.vehicle.delete({
      where: { id },
    });
  },

  async upsertDocument(vehicleId: string, doc: VehicleDocumentInput, tx: Prisma.TransactionClient = prisma) {
    const existing = await tx.document.findFirst({
      where: {
        vehicleId,
        docType: doc.type,
      },
    });

    if (existing) {
      return tx.document.update({
        where: { id: existing.id },
        data: {
          regNumber: doc.documentNumber ?? undefined,
          expiryDate: new Date(doc.expiryDate),
          subtitle: doc.notes ?? undefined,
        },
      });
    }

    const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
    return tx.document.create({
      data: {
        userId: vehicle?.userId || '',
        vehicleId,
        title: doc.type,
        docType: doc.type,
        regNumber: doc.documentNumber ?? vehicle?.reg ?? null,
        expiryDate: new Date(doc.expiryDate),
        subtitle: doc.notes ?? null,
        status: 'ACTIVE',
      },
    });
  },
};
