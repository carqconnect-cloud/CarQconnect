import { GpsDeviceStatus, QrStatus } from '@prisma/client';
import { ApiError } from '../../common/utils/apiError';
import { prisma } from '../../config/database';
import { auditService } from '../audit';
import { adminGpsRepository } from '../admin/gps/adminGps.repository';
import { adminQrRepository } from '../admin/qr/adminQr.repository';
import { vehicleRepository } from './vehicle.repository';
import { CreateVehicleInput, UpdateVehicleInput } from './vehicle.schema';

export function computeReminderStatus(expiryDate: Date | null | undefined): {
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'UP_TO_DATE' | 'NO_REMINDER';
  label: 'Expired' | 'Expiring soon' | 'Up to date';
  daysRemaining: number | null;
} {
  if (!expiryDate) {
    return { status: 'NO_REMINDER', label: 'Up to date', daysRemaining: null };
  }
  const now = Date.now();
  const target = expiryDate.getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (target < now) {
    return { status: 'EXPIRED', label: 'Expired', daysRemaining: diffDays };
  }
  if (diffDays <= 30) {
    return { status: 'EXPIRING_SOON', label: 'Expiring soon', daysRemaining: diffDays };
  }
  return { status: 'UP_TO_DATE', label: 'Up to date', daysRemaining: diffDays };
}

function resolveEffectiveDocExpiry(
  explicitExpiry: string | null | undefined,
  documents?: Array<{ expiryDate: string }>,
): string | null | undefined {
  if (documents && documents.length > 0) {
    const dates = documents.map((d) => new Date(d.expiryDate).getTime()).filter((t) => !isNaN(t));
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      return minDate.toISOString();
    }
  }
  if (explicitExpiry !== undefined) {
    return explicitExpiry;
  }
  return null;
}

export const vehicleService = {
  async createVehicle(userId: string, input: CreateVehicleInput, ipAddress?: string) {
    const effectiveDocExpiry = resolveEffectiveDocExpiry(input.docExpiry, input.documents);

    try {
      return await prisma.$transaction(async (tx) => {
        if (input.isDefault) {
          await vehicleRepository.clearDefault(userId, tx);
        }

        const vehicle = await vehicleRepository.create(
          userId,
          {
            ...input,
            docExpiry: effectiveDocExpiry,
          },
          tx,
        );

        if (!vehicle) {
          throw ApiError.internal('Failed to create vehicle');
        }

        await auditService.record(
          {
            actorId: userId,
            action: 'vehicle.created',
            entity: 'Vehicle',
            entityId: vehicle.id,
            metadata: {
              reg: vehicle.reg,
              model: vehicle.model,
              fuel: vehicle.fuel,
              mileage: vehicle.mileage,
              isDefault: vehicle.isDefault,
            },
            ipAddress,
          },
          tx,
        );

        const reminder = computeReminderStatus(vehicle.docExpiry);

        return {
          ...vehicle,
          reminderStatus: reminder.status,
          reminderLabel: reminder.label,
          daysRemaining: reminder.daysRemaining,
        };
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw ApiError.conflict(`A vehicle with registration number ${input.reg} already exists in your garage`);
      }
      throw err;
    }
  },

  async listVehicles(userId: string) {
    const vehicles = await vehicleRepository.listByUser(userId);

    return vehicles.map((v) => {
      const reminder = computeReminderStatus(v.docExpiry);
      return {
        ...v,
        reminderStatus: reminder.status,
        reminderLabel: reminder.label,
        daysRemaining: reminder.daysRemaining,
      };
    });
  },

  async getVehicleById(id: string, userId: string) {
    const vehicle = await vehicleRepository.findByIdAndUser(id, userId);
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    const reminder = computeReminderStatus(vehicle.docExpiry);

    return {
      ...vehicle,
      reminderStatus: reminder.status,
      reminderLabel: reminder.label,
      daysRemaining: reminder.daysRemaining,
    };
  },

  async updateVehicle(id: string, userId: string, input: UpdateVehicleInput, ipAddress?: string) {
    const existing = await vehicleRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw ApiError.notFound('Vehicle not found');
    }

    const effectiveDocExpiry = resolveEffectiveDocExpiry(
      input.docExpiry,
      input.documents,
    );

    try {
      return await prisma.$transaction(async (tx) => {
        if (input.isDefault) {
          await vehicleRepository.clearDefault(userId, tx);
        }

        const updated = await vehicleRepository.update(
          id,
          userId,
          {
            ...input,
            docExpiry: effectiveDocExpiry ?? existing.docExpiry?.toISOString(),
          },
          tx,
        );

        if (!updated) {
          throw ApiError.internal('Failed to update vehicle');
        }

        await auditService.record(
          {
            actorId: userId,
            action: 'vehicle.updated',
            entity: 'Vehicle',
            entityId: id,
            metadata: {
              reg: updated.reg,
              model: updated.model,
              fuel: updated.fuel,
              isDefault: updated.isDefault,
            },
            ipAddress,
          },
          tx,
        );

        const reminder = computeReminderStatus(updated.docExpiry);

        return {
          ...updated,
          reminderStatus: reminder.status,
          reminderLabel: reminder.label,
          daysRemaining: reminder.daysRemaining,
        };
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw ApiError.conflict(
          `A vehicle with registration number ${input.reg} already exists in your garage`,
        );
      }
      throw err;
    }
  },

  async deleteVehicle(id: string, userId: string, ipAddress?: string) {
    const existing = await vehicleRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw ApiError.notFound('Vehicle not found');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Strict lock ordering: Lock GPS device bound to this vehicle first (if any)
      let gpsDevice = await adminGpsRepository.lockByVehicleId(id, tx);

      // 2. Lock vehicle second
      await adminGpsRepository.lockVehicleById(id, tx);

      // 3. Re-verify bound device under vehicle lock in case a concurrent assignment committed
      // while this transaction was waiting to acquire the vehicle lock.
      if (!gpsDevice) {
        gpsDevice = await adminGpsRepository.lockByVehicleId(id, tx);
      }

      // If a GPS device is currently bound to this vehicle, clean it up atomically
      if (gpsDevice) {
        // Step A: Close active assignment history record (if present)
        const closed = await adminGpsRepository.closeActiveAssignmentHistory(
          gpsDevice.id,
          'VEHICLE_DELETED',
          tx,
          'Vehicle deleted from garage',
        );

        // Step B: Set device status to UNASSIGNED and clear vehicleId
        await adminGpsRepository.update(
          gpsDevice.id,
          {
            vehicleId: null,
            status: GpsDeviceStatus.UNASSIGNED,
          },
          tx,
        );

        // Step C: Record audit event for GPS device unbinding
        await auditService.record(
          {
            actorId: userId,
            action: 'admin.gps_unbound',
            entity: 'GPSDevice',
            entityId: gpsDevice.id,
            metadata: {
              imei: gpsDevice.imei,
              unboundVehicleId: id,
              unboundVehicleReg: existing.reg,
              reason: 'VEHICLE_DELETED',
              activeHistoryFound: closed.count > 0,
            },
            ipAddress,
          },
          tx,
        );
      }

      // 3. Delete vehicle record
      await vehicleRepository.delete(id, tx);

      // 4. Record vehicle deletion audit log
      await auditService.record(
        {
          actorId: userId,
          action: 'vehicle.deleted',
          entity: 'Vehicle',
          entityId: id,
          metadata: {
            reg: existing.reg,
            model: existing.model,
            fuel: existing.fuel,
          },
          ipAddress,
        },
        tx,
      );
    });

    return { success: true };
  },

  async linkQr(vehicleId: string, userId: string, code: string, ipAddress?: string) {
    const vehicle = await vehicleRepository.findByIdAndUser(vehicleId, userId);
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    const normalizedCode = code.trim().toUpperCase();

    return prisma.$transaction(async (tx) => {
      // 1. Lock QR code first
      const qr = await adminQrRepository.lockByCode(normalizedCode, tx);

      if (!qr) {
        throw ApiError.notFound(`QR code '${normalizedCode}' not found`);
      }

      if (qr.status === QrStatus.REPLACED || qr.status === QrStatus.DEACTIVATED) {
        throw ApiError.badRequest(`QR code is permanently retired (${qr.status})`);
      }

      if (qr.vehicleId === vehicle.id) {
        throw ApiError.conflict('QR code is already active on this vehicle');
      }

      if (qr.vehicleId && qr.vehicleId !== vehicle.id) {
        throw ApiError.conflict('QR code is already active on another vehicle');
      }

      // 2. Lock vehicle second
      await adminQrRepository.lockVehicleById(vehicle.id, tx);

      const existingQr = await tx.qrCode.findFirst({
        where: {
          vehicleId: vehicle.id,
          id: { not: qr.id },
          status: { in: [QrStatus.ASSIGNED, QrStatus.ACTIVE, QrStatus.SUSPENDED] },
        },
      });

      if (existingQr) {
        throw ApiError.conflict(
          `Vehicle ${vehicle.reg} already has an active QR code (${existingQr.code})`,
        );
      }

      const updated = await tx.qrCode.update({
        where: { id: qr.id },
        data: {
          vehicleId: vehicle.id,
          status: QrStatus.ACTIVE,
        },
      });

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      await tx.qrAssignmentHistory.create({
        data: {
          qrCodeId: qr.id,
          qrCodeValue: qr.code,
          vehicleId: vehicle.id,
          vehicleReg: vehicle.reg,
          userId,
          userEmail: user?.email ?? null,
          reason: 'CUSTOMER_ACTIVATION',
        },
      });

      await auditService.record(
        {
          actorId: userId,
          action: 'vehicle.qr_linked',
          entity: 'Vehicle',
          entityId: vehicle.id,
          metadata: {
            qrCode: qr.code,
            reg: vehicle.reg,
          },
          ipAddress,
        },
        tx,
      );

      return {
        linked: true,
        code: updated.code,
        status: updated.status.toLowerCase(),
      };
    });
  },

  async unlinkQr(vehicleId: string, userId: string, ipAddress?: string) {
    const vehicle = await vehicleRepository.findByIdAndUser(vehicleId, userId);
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Lock active QR code for vehicle first
      const qr = await adminQrRepository.lockActiveByVehicleId(vehicle.id, tx);

      if (!qr) {
        throw ApiError.notFound('No active QR code linked to this vehicle');
      }

      // 2. Lock vehicle second
      await adminQrRepository.lockVehicleById(vehicle.id, tx);

      await tx.qrCode.update({
        where: { id: qr.id },
        data: {
          vehicleId: null,
          status: QrStatus.AVAILABLE,
        },
      });

      await tx.qrAssignmentHistory.updateMany({
        where: {
          qrCodeId: qr.id,
          unassignedAt: null,
        },
        data: {
          unassignedAt: new Date(),
          reason: 'CUSTOMER_UNLINKED',
        },
      });

      await auditService.record(
        {
          actorId: userId,
          action: 'vehicle.qr_unlinked',
          entity: 'Vehicle',
          entityId: vehicle.id,
          metadata: {
            qrCode: qr.code,
            reg: vehicle.reg,
          },
          ipAddress,
        },
        tx,
      );

      return {
        linked: false,
        code: null,
      };
    });
  },
};
